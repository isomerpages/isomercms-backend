import tracer from "dd-trace"

tracer.init({
  sampleRate: 1,
})

export default tracer
