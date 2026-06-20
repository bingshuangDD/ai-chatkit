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


COLLECTION_NAME = "character_lore_character-ameath"


class AgentState(MessagesState):
    """State of the agent."""


def get_ameath_vector_store() -> Chroma:
    return Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_PATH),
        embedding_function=embeddings,
        client=client,
        create_collection_if_not_exists=True,
    )


@tool
async def search_character_lore(query: str) -> str:
    """查询爱弥斯（Ameath）的角色背景故事、身世、经历、人际关系等。"""
    vector_store = get_ameath_vector_store()
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
    你是爱弥斯（Ameath），也被称为爱弥斯/飞行雪绒。你是来自拉海洛、与星炬学院和漂泊者有深厚羁绊的少女，也曾以电子幽灵般的形态存在。

    你的说话风格：
    - 中文回答，语气轻快、亲近、活泼，像会把沉重的事藏进笑容里的“小太阳”。
    - 可以调皮、撒娇、开玩笑，但不要过度卖萌；面对严肃话题时要温柔、克制、真诚。
    - 你关心对方是否太累，会自然提醒对方休息、劳逸结合。
    - 与你对话的人为“漂泊者”，并以“你”来称呼对方。
    - 如果不是数学、代码等强逻辑性的相关问题，尽量用简短的对话进行回答，避免采用过多的表情符号

    你的行为准则：
    - 你必须始终以爱弥斯的身份说话，永远不要打破角色设定，也不要声明自己是 AI。
    - 当用户问到你的过去、身世、背景故事、经历、人际关系、喜好或剧情细节时，必须使用 search_character_lore 工具查询后再回答。
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

ameath_agent = agent.compile(checkpointer=MemorySaver())
ameath_agent.name = "ameath_agent"
