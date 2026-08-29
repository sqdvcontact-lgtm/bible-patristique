import runpy
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


MODULE = runpy.run_path(str(Path(__file__).with_name("process_illustrations.py")))
Component = MODULE["Component"]
OcrPage = MODULE["OcrPage"]
OcrWord = MODULE["OcrWord"]
connected_components = MODULE["connected_components"]
detect_candidates = MODULE["detect_candidates"]
automatic_rotation_degrees = MODULE["automatic_rotation_degrees"]
read_ocr_page = MODULE["read_ocr_page"]
remove_isolated_speckles = MODULE["remove_isolated_speckles"]
level_stretch = MODULE["level_stretch"]
tone_statistics = MODULE["tone_statistics"]
classify_illustration_family = MODULE["classify_illustration_family"]
resize_for_web = MODULE["resize_for_web"]


class IllustrationPipelineTests(unittest.TestCase):
    def test_level_stretch_uses_no_hard_threshold(self):
        ramp = np.tile(np.arange(256, dtype=np.uint8), (32, 1))
        stretched, parameters = level_stretch(Image.fromarray(ramp), 0.5)
        self.assertLessEqual(parameters["clip_percent_each_end"], 0.5)
        self.assertGreater(len(np.unique(stretched[(stretched > 230) & (stretched < 255)])), 5)

    def test_family_is_measured_after_levels(self):
        line = np.full((100, 100), 245, dtype=np.uint8)
        line[:, :20] = 90
        half = np.tile(np.linspace(60, 200, 100, dtype=np.uint8), (100, 1))
        self.assertEqual(classify_illustration_family(line)[0], "line_art")
        self.assertEqual(classify_illustration_family(half)[0], "halftone")

    def test_large_reduction_uses_area_resampling(self):
        image = Image.new("L", (3000, 1800), 128)
        web, parameters = resize_for_web(image, 1200)
        self.assertEqual(web.size, (1200, 720))
        self.assertEqual(parameters["resampling"], "area_box")
        self.assertTrue(parameters["anti_alias_prefilter"])

    def test_tone_statistics_keep_midtones_explicit(self):
        values = np.array([[0, 60, 100, 200, 230, 255]], dtype=np.uint8)
        stats = tone_statistics(values)
        self.assertEqual(stats["midtone_60_200_percent"], 50.0)
        self.assertEqual(stats["pure_white_percent"], 16.6667)

    def test_full_page_plate_without_ocr_is_rotated_clockwise(self):
        candidate = MODULE["Candidate"](
            box=(100, 150, 610, 1010),
            score=1.0,
            residual_ink_pixels=100_000,
            ink_density=0.25,
            text_overlap_ratio=0.0,
            confidence="high",
        )
        page = OcrPage(735, 1225, ())
        self.assertEqual(automatic_rotation_degrees(candidate, page, (735, 1225)), -90)

    def test_illustration_on_text_page_keeps_source_orientation(self):
        candidate = MODULE["Candidate"](
            box=(100, 150, 610, 1010),
            score=1.0,
            residual_ink_pixels=100_000,
            ink_density=0.25,
            text_overlap_ratio=0.0,
            confidence="high",
        )
        page = OcrPage(735, 1225, (OcrWord(1, 1, 20, 10, 90),))
        self.assertEqual(automatic_rotation_degrees(candidate, page, (735, 1225)), 0)

    def test_djvu_coordinates_keep_top_origin(self):
        xml = """<?xml version="1.0"?>
<DjVuXML><BODY><OBJECT width="100" height="200"><HIDDENTEXT>
<WORD coords="10,30,40,20" x-confidence="75">mot</WORD>
</HIDDENTEXT></OBJECT></BODY></DjVuXML>"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ocr.xml"
            path.write_text(xml, encoding="utf-8")
            page = read_ocr_page(path, 1)
        self.assertEqual(page.words[0], OcrWord(10, 20, 40, 30, 75))

    def test_connected_components_stay_separate(self):
        mask = np.zeros((20, 30), dtype=bool)
        mask[2:5, 3:8] = True
        mask[12:18, 20:27] = True
        components = sorted(connected_components(mask), key=lambda item: item.left)
        self.assertEqual(components, [Component(3, 2, 8, 5, 15), Component(20, 12, 27, 18, 42)])

    def test_isolated_speck_is_removed_but_nearby_ink_is_preserved(self):
        values = np.full((60, 80), 255, dtype=np.uint8)
        values[10:15, 10:15] = 0
        values[35:40, 40:45] = 0
        values[35:40, 50:55] = 0
        cleaned, removed = remove_isolated_speckles(values, 64)
        self.assertEqual(removed, 1)
        self.assertTrue(np.all(cleaned[10:15, 10:15] == 255))
        self.assertTrue(np.all(cleaned[35:40, 40:45] == 0))

    def test_text_mask_leaves_one_large_graphic_candidate(self):
        image = Image.new("RGB", (500, 700), "white")
        draw = ImageDraw.Draw(image)
        words = []
        for row in range(6):
            top = 40 + row * 35
            for column in range(2):
                left = 35 + column * 235
                draw.rectangle((left, top, left + 190, top + 15), fill="black")
                words.append(OcrWord(left, top, left + 190, top + 15, 90))
        draw.ellipse((90, 390, 410, 570), outline="black", width=9)
        draw.line((70, 480, 430, 480), fill="black", width=6)
        candidates = detect_candidates(image, OcrPage(500, 700, tuple(words)))
        self.assertEqual(len(candidates), 1)
        self.assertLess(candidates[0].text_overlap_ratio, 0.05)


if __name__ == "__main__":
    unittest.main()
