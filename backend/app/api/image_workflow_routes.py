"""FastAPI routes for the image generation workflow.

POST /image-workflows/generate
"""

import logging

from fastapi import APIRouter, status
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse

from image_workflows.schemas import GenerateImageRequest, GenerateImageResponse
from image_workflows.service import (
    WorkflowValidationError,
    generate_image_workflow,
)
from image_workflows.jimeng_client import (
    JimengAuthError,
    JimengServiceError,
    JimengTimeoutError,
)

logger = logging.getLogger(__name__)

image_workflow_router = APIRouter(
    prefix="/image-workflows",
    tags=["image-workflows"],
)


@image_workflow_router.post(
    "/generate",
    response_model=GenerateImageResponse,
)
async def generate(request: GenerateImageRequest) -> GenerateImageResponse:
    """Generate images via Jimeng (DreamSeed).

    Supports text-to-image, image-to-image, and multi-image fusion modes.
    Optionally optimizes the prompt via Kimi before calling Jimeng.
    """
    try:
        return await generate_image_workflow(request)
    except WorkflowValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except JimengAuthError as exc:
        logger.error("Jimeng auth failed: %s", exc)
        raise HTTPException(status_code=401, detail="Image generation API key is invalid")
    except JimengTimeoutError as exc:
        logger.error("Jimeng timeout: %s", exc)
        raise HTTPException(status_code=504, detail="Image generation timed out")
    except JimengServiceError as exc:
        logger.error("Jimeng service error: %s", exc)
        raise HTTPException(status_code=502, detail="Image generation service returned an error")
    except Exception as exc:
        logger.exception("Unexpected error during image generation")
        raise HTTPException(status_code=500, detail="Unexpected error during image generation")
