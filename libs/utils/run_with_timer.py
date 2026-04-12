import logging
from functools import wraps
from timeit import default_timer as timer


def run_with_timer(
    logger: logging.Logger = logging.getLogger(__name__), level: int = logging.INFO
):
    """Декоратор для логирования времени выполнения функции."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = timer()
            result = func(*args, **kwargs)
            elapsed = timer() - start_time

            log = f"{func.__name__}() выполнена за {elapsed:4f} сек."
            if level == logging.DEBUG:
                logger.debug(log)
            else:
                logger.info(log)

            return result

        return wrapper

    return decorator
