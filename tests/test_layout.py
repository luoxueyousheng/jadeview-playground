import math
import re
import unittest
from host.layout import layout_bounds

def evaluate(expression, viewport):
    match = re.fullmatch(r"(-?[\d.]+)%([+-])([\d.]+)px", expression)
    if not match:
        return float(expression.removesuffix("px"))
    percent, sign, pixels = match.groups()
    return float(percent) * viewport / 100 + float(pixels) * (1 if sign == "+" else -1)

class LayoutTests(unittest.TestCase):
    rectangle = {"x": 480, "y": 132, "width": 800, "height": 600,
        "viewportWidth": 1320, "viewportHeight": 820}

    def rectangles(self, mode, count, ratio=.5, viewport=(1320, 820)):
        result = layout_bounds(mode, count, self.rectangle, ratio)
        return [[evaluate(cell[0], viewport[0]), evaluate(cell[1], viewport[1]),
            evaluate(cell[2], viewport[0]), evaluate(cell[3], viewport[1])] for cell in result]

    def test_split_covers_workspace_and_keeps_gutter(self):
        left, right = self.rectangles("columns", 2, .35)
        self.assertAlmostEqual(left[0], 480, places=2)
        self.assertAlmostEqual(left[2] / (left[2] + right[2]), .35, places=3)
        self.assertAlmostEqual(right[0] - left[0] - left[2], 8, places=2)
        self.assertAlmostEqual(right[0] + right[2], 1280, places=2)

    def test_native_percentages_resize_without_frontend_reflow(self):
        left, right = self.rectangles("columns", 2, viewport=(1520, 920))
        self.assertAlmostEqual(left[0], 480, places=2)
        self.assertAlmostEqual(right[0] + right[2], 1480, places=2)
        self.assertAlmostEqual(left[1] + left[3], 832, places=2)

    def test_grid_cells_are_inside_workspace_and_do_not_overlap(self):
        for count in range(1, 7):
            cells = self.rectangles("grid", count)
            for index, (x, y, width, height) in enumerate(cells):
                self.assertGreater(width, 0)
                self.assertGreater(height, 0)
                self.assertGreaterEqual(x, 480 - .01)
                self.assertGreaterEqual(y, 132 - .01)
                self.assertLessEqual(x + width, 1280.01)
                self.assertLessEqual(y + height, 732.01)
                for other in cells[index + 1:]:
                    ox, oy, ow, oh = other
                    self.assertTrue(x + width <= ox + .01 or ox + ow <= x + .01 or
                        y + height <= oy + .01 or oy + oh <= y + .01)

    def test_invalid_geometry_is_rejected(self):
        for key in ("x", "y", "width", "height"):
            with self.assertRaises(ValueError):
                layout_bounds("columns", 2, {**self.rectangle, key: math.nan})
        with self.assertRaises(ValueError):
            layout_bounds("columns", 2, self.rectangle, math.nan)
        with self.assertRaises(ValueError):
            layout_bounds("grid", 7, self.rectangle)

if __name__ == "__main__":
    unittest.main()
