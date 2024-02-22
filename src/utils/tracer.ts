import tracer from "dd-trace"

tracer.init({
  sampleRate: 1,
  logInjection: true,
})

export default tracer
