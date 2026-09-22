// Depth maps for images, run in its own process (transformers.js bundles its own sharp, which cannot share a process
// with the project's). Usage: node scripts/depth.mjs <in.png> <out.png> [<in.png> <out.png> ...]   (near = white)
import { pipeline, RawImage } from '@huggingface/transformers';

const args = process.argv.slice(2);
const depth = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: 'fp32' });
for (let i = 0; i + 1 < args.length; i += 2) {
  const out = await depth(await RawImage.read(args[i]));
  await out.depth.save(args[i + 1]);
  console.log('depth', args[i + 1]);
}
