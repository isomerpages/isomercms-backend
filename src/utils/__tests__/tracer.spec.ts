// @ts-nocheck

/*
this test file is not testing our own code.
Because dd-trace is not compatible with neverthrow, we introduced a patch to fix dd-trace itself.
This test file verifies that the patch we apply does what it intends to, which is to retain the neverthrow
interface when code that is traced or wrapped return a neverthrow ResultAsync result.
*/

import tracer from "dd-trace"
import { errAsync, okAsync } from "neverthrow"

describe("NeverThrow compatibility", () => {
  describe("tracer.trace()", () => {
    it("should maintain the neverthrow interface for ok results", async () => {
      const resultAsync = tracer.trace("foo", () => okAsync(1))

      expect(resultAsync.then).toBeDefined() // promise interface
      expect(resultAsync.andThen).toBeDefined() // neverthrow interface
      expect(resultAsync.orElse).toBeDefined()

      const res = await resultAsync

      expect(res.isOk()).toStrictEqual(true)
      expect(res.unwrapOr(0)).toStrictEqual(1)
    })

    it("should maintain the neverthrow interface for error results", async () => {
      const resultAsync = tracer.trace("foo", () =>
        errAsync(new Error("foo error"))
      )

      expect(resultAsync.then).toBeDefined() // promise interface
      expect(resultAsync.andThen).toBeDefined() // neverthrow interface
      expect(resultAsync.orElse).toBeDefined()

      const res = await resultAsync

      expect(res.isOk()).toStrictEqual(false)
      expect(res.isErr()).toStrictEqual(true)

      expect(res.error.message).toStrictEqual("foo error")
    })
  })

  describe("tracer.wrap()", () => {
    it("should maintain the neverthrow interface for ok results", async () => {
      const foo = () => okAsync(1)
      const wrappedFoo = tracer.wrap("foo", foo)

      const resultAsync = wrappedFoo()

      expect(resultAsync.then).toBeDefined() // promise interface
      expect(resultAsync.andThen).toBeDefined() // neverthrow interface
      expect(resultAsync.orElse).toBeDefined()

      const res = await resultAsync

      expect(res.isOk()).toStrictEqual(true)
      expect(res.unwrapOr(0)).toStrictEqual(1)
    })

    it("should maintain the neverthrow interface for error results", async () => {
      const foo = () => errAsync(new Error("foo error"))
      const wrappedFoo = tracer.wrap("foo", foo)

      const resultAsync = wrappedFoo()

      expect(resultAsync.then).toBeDefined() // promise interface
      expect(resultAsync.andThen).toBeDefined() // neverthrow interface
      expect(resultAsync.orElse).toBeDefined()

      const res = await resultAsync

      expect(res.isOk()).toStrictEqual(false)
      expect(res.isErr()).toStrictEqual(true)

      expect(res.error.message).toStrictEqual("foo error")
    })
  })
})
