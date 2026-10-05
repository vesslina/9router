/**
 * Regression test: tool parameter literally named "properties"
 *
 * Antigravity rejects the request with:
 *   Invalid value at '...function_declarations[N].parameters.properties[M].value'
 *   (...aiplatform.master.Schema), "object"
 *
 * Cause: ensureObjectType() treated the outer `properties` map as a schema node
 * when a tool has a parameter named "properties", and injected `type: "object"`
 * into it, i.e. a fake parameter called "type" whose schema is the string "object".
 */

import { describe, it, expect } from "vitest";
import { cleanJSONSchemaForAntigravity } from "../../open-sse/translator/formats/gemini.js";

describe("cleanJSONSchemaForAntigravity with a parameter named \"properties\"", () => {
  const schema = {
    type: "object",
    properties: {
      path: { type: "string" },
      properties: { type: "object", description: "free-form values" },
    },
    required: ["path"],
  };

  it("does not inject a fake \"type\" parameter into the properties map", () => {
    const result = cleanJSONSchemaForAntigravity(structuredClone(schema));
    expect(result.properties).not.toHaveProperty("type");
    expect(Object.keys(result.properties)).toEqual(["path", "properties"]);
  });

  it("keeps every entry of every properties map an object schema", () => {
    const result = cleanJSONSchemaForAntigravity(structuredClone(schema));
    const check = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.properties) {
        for (const value of Object.values(node.properties)) {
          expect(typeof value).toBe("object");
          check(value);
        }
      }
    };
    check(result);
  });

  it("still adds type: object to a schema node that has properties but no type", () => {
    const result = cleanJSONSchemaForAntigravity({
      properties: { a: { properties: { b: { type: "string" } } } },
    });
    expect(result.type).toBe("object");
    expect(result.properties.a.type).toBe("object");
  });
});
