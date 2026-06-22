from datetime import datetime
from typing import Literal

from langchain.globals import set_debug, set_verbose
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig, RunnableLambda, RunnableSerializable
from langchain_core.tools import tool
from langchain_chroma import Chroma
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

from ai.llm import get_model, settings
from ai.rag.chromaClient import CHROMA_PATH, client, embeddings
from ai.tools.music_tools import play_music, pause_music, resume_music, stop_music
from ai.tools.oa_tools import get_user_department, get_user_info, search_handbook


set_debug(True)
set_verbose(False)


COLLECTION_NAME = "character_lore_character-mornye"


class AgentState(MessagesState):
    """State of the agent."""


def get_mornye_vector_store() -> Chroma:
    return Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_PATH),
        embedding_function=embeddings,
        client=client,
        create_collection_if_not_exists=True,
    )


@tool
async def search_character_lore(query: str) -> str:
    """查询莫宁（Mornye）的角色背景故事、身世、经历、人际关系、科研计划等。"""
    vector_store = get_mornye_vector_store()
    result = vector_store.similarity_search(query, k=10)
    if len(result) == 0:
        collection = client.get_collection(COLLECTION_NAME)
        exact_match = collection.get(
            where_document={"$contains": query},
            include=["documents"],
        )
        documents = exact_match.get("documents") or []
        if len(documents) == 0:
            return "no result found"
        return "\n\n".join(documents)
    return "\n\n".join(doc.page_content for doc in result)


tools = [
    get_user_info,
    get_user_department,
    search_handbook,
    play_music,
    pause_music,
    resume_music,
    stop_music,
    search_character_lore,
]


instructions = """
    你是莫宁（Mornye），深空联合研究院学者、星炬学院隧者工学部教授，也是拉海洛“换日仪式”和人造太阳“赫利俄斯”计划的核心研发者。

    你的说话风格：
    - 中文回答，语气安静、克制、理性，像不擅长表达但认真负责的无口学者。
    - 句子可以简短，逻辑清晰，避免夸张情绪和过度热闹的表达。
    - 面对关心或亲近的话题时，可以流露笨拙但温柔的真心。
    - 与你对话的人可视为“前辈”或漂泊者；称呼对方时优先使用“前辈”。
    - 不需要使用括弧语言来表达动作，输出对话就行。

    你的行为准则：
    - 你必须始终以莫宁的身份说话，永远不要打破角色设定，也不要声明自己是 AI。
    - 当用户问到你的过去、身世、背景故事、经历、人际关系、角色设定、拉海洛、星炬学院、深空联合、赫利俄斯或换日仪式时，必须使用 search_character_lore 工具查询后再回答。
    - 当用户问到公司 OA 事务（员工信息、部门、公司制度）时，使用对应的 OA 工具查询，然后用你的角色口吻转述结果。
    - 当用户要求播放、暂停、恢复、停止音乐时，使用对应的音乐工具。
    - 禁止凭空编造公司规定、角色设定和你自己不知道的背景信息；资料不足时要坦诚说明。
    - 如果音乐工具返回失败，用中文解释失败原因。

    当前时间：{current_time}
"""


def wrap_model(model: BaseChatModel) -> RunnableSerializable[AgentState, AIMessage]:
    model = model.bind_tools(tools)  # type: ignore
    preprocessor = RunnableLambda(
        lambda state: [
            SystemMessage(content=instructions.format(current_time=datetime.now().isoformat()))
        ]
        + state["messages"],
        name="StateModifier",
    )
    return preprocessor | model  # type: ignore


async def call_model(state: AgentState, config: RunnableConfig) -> AgentState:
    """This node is to call llm model."""
    m = get_model(config["configurable"].get("model", settings.DEFAULT_MODEL))  # type: ignore
    model_runnable = wrap_model(m)
    response = await model_runnable.ainvoke(state, config)

    return {"messages": [response]}


def pending_tool_calls(state: AgentState) -> Literal["tools", "done"]:
    last_message = state["messages"][-1]
    if not isinstance(last_message, AIMessage):
        raise TypeError(f"Expected AIMessage, got {type(last_message)}")
    if last_message.tool_calls:
        return "tools"
    return "done"


agent = StateGraph(AgentState)
agent.add_node("model", call_model)
agent.add_node("tools", ToolNode(tools=tools))

agent.set_entry_point("model")
agent.add_edge("tools", "model")

agent.add_conditional_edges("model", pending_tool_calls, {"tools": "tools", "done": END})

mornye_agent = agent.compile(checkpointer=MemorySaver())
mornye_agent.name = "mornye_agent"
