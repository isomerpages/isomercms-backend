import tracer from "dd-trace"

tracer.init({
  logInjection: true, // https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/nodejs/
  runtimeMetrics: true, // https://docs.datadoghq.com/tracing/metrics/runtime_metrics/nodejs
  sampleRate: 1,
})

export default tracer
