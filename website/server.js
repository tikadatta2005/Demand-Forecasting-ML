import fastifyCompress from "@fastify/compress";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";
import { join } from "path";
import ort from "onnxruntime-node";

const f = fastify({ logger: true });

const server = async () => {
  try {
    await f.register(fastifyCors, {});

    await f.register(fastifyStatic, {
      root: join(process.cwd(), "public"),
      prefix: "/",
    });

    await f.register(fastifyCompress);

    f.post("/api/get-prediction", async (req, reply) => {
      try {
        const { item_id, month_index, day } = req.body;

        if (!item_id || !month_index || !day) {
          return reply.code(400).send({ error: "Item and month is required!" });
        }

        const session = await ort.InferenceSession.create(
          "./model/sales_prediction.onnx",
        );

        const mapping_array = Array.from(Array(113)).map((_, index) => {
          return index === item_id || index === 100 + month_index ? 1 : 0;
        });

        mapping_array[0] = (day - 1) / (32 - 1);

        const tensor = new ort.Tensor(
          "float32",
          new Float32Array(mapping_array),
          [1, 113],
        );

        const inputName = session.inputNames[0];

        // Run inference
        const results = await session.run({
          [inputName]: tensor,
        });

        // Get output
        const outputName = session.outputNames[0];
        const output = results[outputName];

        console.log("Model Output:", output.data[0]);

        return reply.code(200).send({ prediction: Math.round(output.data[0]) });
      } catch (error) {
        console.log(error);
        return reply.code(500).send({ error: error?.message });
      }
    });

    await f.listen({ port: 3000,   host: "0.0.0.0" });
  } catch (error) {
    f.log.error(error);
  }
};

server();
