from langchain_core.tools import tool

from music.service import (
    MusicServiceError,
    create_pause_command,
    create_play_command,
    create_resume_command,
    create_stop_command,
)


def _command_response(command) -> dict:
    return {
        "kind": "player_command",
        "command": command.model_dump(),
    }


def _error_response(message: str) -> dict:
    return {
        "kind": "player_error",
        "message": message,
    }


@tool
async def play_music(query: str) -> dict:
    """Play music by searching for the user's song query."""
    try:
        return _command_response(await create_play_command(query))
    except MusicServiceError as exc:
        return _error_response(str(exc))


@tool
async def pause_music() -> dict:
    """Pause current music playback."""
    return _command_response(create_pause_command())


@tool
async def resume_music() -> dict:
    """Resume current music playback."""
    return _command_response(create_resume_command())


@tool
async def stop_music() -> dict:
    """Stop current music playback."""
    return _command_response(create_stop_command())

