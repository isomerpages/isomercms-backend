import tracer from "dd-trace"

tracer.init({
  logInjection: true,
  sampleRate: 1,
})

export default tracer
