"""Convert local data URLs / base64 images into publicly-accessible URLs.

Jimeng's ``image`` field only accepts public URLs, so the backend must stage
reference images before passing them to the generation API.

Current implementation: data URLs are passed through (the user uploads are
already sent from the frontend as data URLs; this module provides the hook
for future TOS / OSS object-storage integration).
"""

import base64
import logging

logger = logging.getLogger(__name__)


async def stage_reference_images(reference_images: list[str]) -> list[str]:
    """Ensure every reference image is a public URL.

    * URLs that already start with ``http://`` or ``https://`` are returned as-is.
    * Data URLs are currently passed through (assumed to be valid for Kimi prompt
      generation).  A future integration with Volcengine TOS will upload these
      and return the resulting public URL.
    """
    urls: list[str] = []

    for image in reference_images:
        image = image.strip()
        if not image:
            continue

        if image.startswith("http://") or image.startswith("https://"):
            urls.append(image)
        elif image.startswith("data:"):
            # TODO: integrate Volcengine TOS upload and replace with public URL
            logger.warning(
                "Data URL reference image passed without TOS staging — "
                "Jimeng may reject it. Configure TOS_* env vars for production."
            )
            urls.append(image)
        else:
            logger.warning("Unknown reference image format, skipping: %s...", image[:80])

    return urls


async def upload_data_url_to_tos(_data_url: str) -> str:
    """Placeholder: upload a data URL to Volcengine TOS and return the public URL.

    To be implemented once TOS credentials are available. See the design doc §5.1.
    """
    raise NotImplementedError(
        "TOS upload not yet implemented — configure TOS_ACCESS_KEY_ID, "
        "TOS_SECRET_ACCESS_KEY, TOS_ENDPOINT, and TOS_BUCKET"
    )
