"""
Simplified pytest tests for exported ONNX models.

Run with: pytest tests/test_models.py -v
"""

import pytest
import numpy as np
import onnx
import onnxruntime as ort


class TestModelFiles:
    """Test model file existence and validity."""

    def test_model_exists_and_valid(self, model_path, model_specs):
        """Test that model file exists, has correct size, and is valid ONNX."""
        assert model_path.exists(), f"Model file not found: {model_path}"

        file_size_mb = model_path.stat().st_size / (1024 * 1024)
        model_name = model_path.stem
        spec = model_specs[model_name]
        assert spec["min_size_mb"] <= file_size_mb <= spec["max_size_mb"], (
            f"{model_name} file size {file_size_mb:.1f}MB outside range "
            f"[{spec['min_size_mb']}-{spec['max_size_mb']}MB]"
        )

        model = onnx.load(str(model_path))
        onnx.checker.check_model(model)


class TestModelProperties:
    """Test model properties."""

    def test_model_properties(self, model_path, expected_config):
        """Test opset, shapes, and I/O names are correct."""
        model = onnx.load(str(model_path))

        opset_version = model.opset_import[0].version
        assert opset_version == expected_config["opset"]

        input_shape = [d.dim_value for d in model.graph.input[0].type.tensor_type.shape.dim]
        input_name = model.graph.input[0].name
        assert input_shape == expected_config["input_shape"]
        assert input_name == expected_config["input_name"]

        output_shape = [d.dim_value for d in model.graph.output[0].type.tensor_type.shape.dim]
        output_name = model.graph.output[0].name
        assert output_shape == expected_config["output_shape"]
        assert output_name == expected_config["output_name"]


class TestModelLoading:
    """Test model loading with ONNX Runtime."""

    def test_model_loads_and_has_correct_metadata(self, onnx_session, expected_config):
        """Test model loads and has correct input/output metadata."""
        assert onnx_session is not None

        input_meta = onnx_session.get_inputs()[0]
        assert input_meta.name == expected_config["input_name"]
        assert input_meta.shape == expected_config["input_shape"]

        output_meta = onnx_session.get_outputs()[0]
        assert output_meta.name == expected_config["output_name"]
        assert output_meta.shape == expected_config["output_shape"]


@pytest.mark.inference
class TestModelInference:
    """Test model inference."""

    def test_inference_basic(self, onnx_session, dummy_image, expected_config):
        """Test inference runs and produces correct output."""
        input_name = onnx_session.get_inputs()[0].name
        outputs = onnx_session.run(None, {input_name: dummy_image})

        assert outputs is not None

        output = outputs[0]
        expected_shape = tuple(expected_config["output_shape"])
        assert output.shape == expected_shape

        assert output.dtype == np.float32

    def test_output_validation(self, onnx_session, dummy_image):
        """Test output values are valid."""
        input_name = onnx_session.get_inputs()[0].name
        outputs = onnx_session.run(None, {input_name: dummy_image})
        output = outputs[0]

        assert np.all(np.isfinite(output))

        assert output.min() >= 0
        assert output.max() < 1000


@pytest.mark.slow
@pytest.mark.inference
class TestModelPerformance:
    """Test model performance."""

    def test_inference_performance(self, onnx_session, dummy_image):
        """Verify inference completes in reasonable time."""
        import time

        input_name = onnx_session.get_inputs()[0].name

        _ = onnx_session.run(None, {input_name: dummy_image})

        start = time.time()
        _ = onnx_session.run(None, {input_name: dummy_image})
        elapsed = time.time() - start

        assert elapsed < 5.0, f"Inference took {elapsed:.2f}s (too slow)"


class TestMetadataFiles:
    """Test metadata JSON files."""

    def test_models_json(self, models_metadata, expected_config):
        """Test models.json structure and content."""
        for key in ["version", "exported_at", "onnx_config", "models"]:
            assert key in models_metadata

        onnx_config = models_metadata["onnx_config"]
        assert onnx_config["opset"] == expected_config["opset"]
        assert onnx_config["dynamic"] is False
        assert onnx_config["nms"] is False

        assert len(models_metadata["models"]) == 3

        for model in models_metadata["models"]:
            required_fields = [
                "id", "name", "file", "description", "size_mb",
                "input_shape", "output_shape", "parameters", "recommended_use"
            ]
            for field in required_fields:
                assert field in model, f"Model missing field: {field}"

    def test_coco_classes(self, coco_classes):
        """Test coco_classes.json structure and content."""
        assert coco_classes["num_classes"] == 80
        assert len(coco_classes["classes"]) == 80

        assert coco_classes["classes"][0] == {"id": 0, "name": "person"}
        assert coco_classes["classes"][79] == {"id": 79, "name": "toothbrush"}

        class_ids = [cls["id"] for cls in coco_classes["classes"]]
        assert class_ids == list(range(80))

        for cls in coco_classes["classes"]:
            assert "name" in cls and len(cls["name"]) > 0


@pytest.mark.integration
class TestEndToEnd:
    """Integration test for complete pipeline."""

    def test_full_inference_pipeline(self, model_paths, coco_classes):
        """Test complete inference from loading to output parsing."""
        model_path = model_paths["yolo11n"]

        session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])

        dummy_input = np.random.randn(1, 3, 640, 640).astype(np.float32)
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: dummy_input})

        output = outputs[0]
        batch_size, num_features, num_predictions = output.shape

        assert batch_size == 1
        assert num_features == 84  # 4 bbox + 80 classes
        assert num_predictions == 8400

        for i in range(min(3, num_predictions)):
            prediction = output[0, :, i]
            bbox = prediction[:4]  # cx, cy, w, h
            class_scores = prediction[4:]  # 80 classes

            assert len(bbox) == 4
            assert len(class_scores) == 80
            assert len(coco_classes["classes"]) == 80
