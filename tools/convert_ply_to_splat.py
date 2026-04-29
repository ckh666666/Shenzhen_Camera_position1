from plyfile import PlyData
import numpy as np
import argparse
from io import BytesIO


def process_ply_to_splat(ply_file_path):
    plydata = PlyData.read(ply_file_path)
    vert = plydata["vertex"]
    sorted_indices = np.argsort(
        -np.exp(vert["scale_0"] + vert["scale_1"] + vert["scale_2"])
        / (1 + np.exp(-vert["opacity"]))
    )

    buffer = BytesIO()
    sh_c0 = 0.28209479177387814

    for idx in sorted_indices:
        v = vert[idx]
        position = np.array([v["x"], v["y"], v["z"]], dtype=np.float32)
        scales = np.exp(
            np.array([v["scale_0"], v["scale_1"], v["scale_2"]], dtype=np.float32)
        )
        rot = np.array([v["rot_0"], v["rot_1"], v["rot_2"], v["rot_3"]], dtype=np.float32)
        color = np.array(
            [
                0.5 + sh_c0 * v["f_dc_0"],
                0.5 + sh_c0 * v["f_dc_1"],
                0.5 + sh_c0 * v["f_dc_2"],
                1 / (1 + np.exp(-v["opacity"])),
            ]
        )

        buffer.write(position.tobytes())
        buffer.write(scales.tobytes())
        buffer.write((color * 255).clip(0, 255).astype(np.uint8).tobytes())
        buffer.write(
            ((rot / np.linalg.norm(rot)) * 128 + 128).clip(0, 255).astype(np.uint8).tobytes()
        )

    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description="Convert 3DGS .ply to antimatter15 .splat")
    parser.add_argument("input", help="Input .ply path")
    parser.add_argument("-o", "--output", required=True, help="Output .splat path")
    args = parser.parse_args()

    print(f"Converting: {args.input}")
    splat_data = process_ply_to_splat(args.input)

    with open(args.output, "wb") as f:
        f.write(splat_data)

    print(f"Saved: {args.output}")


if __name__ == "__main__":
    main()
