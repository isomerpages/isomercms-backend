import tracer from "dd-trace"

import { config } from "../config/config"

const env = config.get("dataDog.env")

tracer.init({
  // NOTE: We require that the `logInjection` be dynamically set
  // as otherwise it'll inject the dd object on local
  logInjection: env !== "local", // https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/nodejs/
  runtimeMetrics: true, // https://docs.datadoghq.com/tracing/metrics/runtime_metrics/nodejs
  sampleRate: 1,
})

export default tracer
