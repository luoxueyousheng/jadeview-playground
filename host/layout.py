"""Pure CSS-like bounds for actual native WebViews, not HTML iframes."""
from __future__ import annotations
import math

def layout_bounds(mode: str, count: int, rect: dict, ratio: float = .5):
    if mode not in ("columns", "rows", "grid"):
        raise ValueError("Unknown layout")
    if not 1 <= count <= 6:
        raise ValueError("Use between one and six WebViews")
    numbers = [float(rect[key]) for key in ("x", "y", "width", "height")]
    if not all(math.isfinite(value) for value in numbers):
        raise ValueError("Layout coordinates must be finite")
    x, y, width, height = numbers
    if x < 0 or y < 0 or width < 64 or height < 64:
        raise ValueError("The workspace is too small")
    ratio = float(ratio)
    if not math.isfinite(ratio):
        raise ValueError("Split ratio must be finite")
    ratio = max(.15, min(.85, ratio))
    gap = 8
    if mode == "grid":
        columns = math.ceil(math.sqrt(count))
        rows = math.ceil(count / columns)
    else:
        columns, rows = (count, 1) if mode == "columns" else (1, count)
    result = []
    for index in range(count):
        column, row = index % columns, index // columns
        left = column * (width + gap) / columns
        top = row * (height + gap) / rows
        pane_width = (width - gap * (columns - 1)) / columns
        pane_height = (height - gap * (rows - 1)) / rows
        if count == 2 and mode in ("columns", "rows"):
            total = width if mode == "columns" else height
            first = (total - gap) * ratio
            start = 0 if index == 0 else first + gap
            length = first if index == 0 else total - first - gap
            if mode == "columns":
                left, pane_width = start, length
            else:
                top, pane_height = start, length
        if min(pane_width, pane_height) < 32:
            raise ValueError("Too many WebViews for this workspace")
        viewport_width = float(rect.get("viewportWidth", width + x))
        viewport_height = float(rect.get("viewportHeight", height + y))
        if not all(math.isfinite(value) and value > 0 for value in (viewport_width, viewport_height)):
            raise ValueError("Invalid viewport")
        if count == 2 and mode in ("columns", "rows"):
            fraction = ratio if index == 0 else 1 - ratio
            start_fraction = 0 if index == 0 else ratio
            if mode == "columns":
                left_fraction, top_fraction = start_fraction, 0
                width_fraction, height_fraction = fraction, 1
            else:
                left_fraction, top_fraction = 0, start_fraction
                width_fraction, height_fraction = 1, fraction
        else:
            left_fraction, top_fraction = column / columns, row / rows
            width_fraction, height_fraction = 1 / columns, 1 / rows
        def expression(position, fraction, viewport):
            pixels = position - fraction * viewport
            if abs(fraction) < .000001:
                return str(round(pixels, 3)) + "px"
            sign = "+" if pixels >= 0 else "-"
            return str(round(fraction * 100, 6)) + "%" + sign + str(round(abs(pixels), 3)) + "px"
        result.append([
            expression(x + left, left_fraction, viewport_width),
            expression(y + top, top_fraction, viewport_height),
            expression(pane_width, width_fraction, viewport_width),
            expression(pane_height, height_fraction, viewport_height)])
    return result
