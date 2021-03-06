let _arima = null
let _sarima = null
let _acf = null
let _pacf = null
let _promise = null
let ctsa = require('./ctsa.js')

const seq = n => Array(n).fill(null)

;(async () => {
  _promise = ctsa()
  ctsa = await _promise

  _arima = ctsa.cwrap('calc_arima', 'number', [
    'array',
    'number', 'number', 'number',
    'number', 'number', 'number', 'number', 'boolean'])
  _sarima = ctsa.cwrap('calc_sarima', 'number', [
    'array',
    'number', 'number', 'number',
    'number', 'number', 'number', 'number',
    'number', 'number', 'number', 'number', 'boolean'])
  _acf = ctsa.cwrap('calc_acf', 'number', [
    'array',
    'number', 'number', 'number'])
  _pacf = ctsa.cwrap('calc_pacf', 'number', [
    'array',
    'number', 'number', 'number'])
})()

const writedoublearray = arr => {
  const farr = arr.flat()
  for (let i = 0; i < farr.length - 2; i++)
    if (isNaN(farr[i + 1]))
      farr[i + 1] = farr[i]
  return new Uint8Array(Float64Array.from(farr).buffer)
}

const readdoublearray = (addr, length) => {
  const res = [[], []]
  for (let i = 0; i < length * 2; i++)
    res[i < length ? 0 : 1].push(ctsa.HEAPF64[addr / Float64Array.BYTES_PER_ELEMENT + i])
  return res
}

const readarray = (addr, length) => {
  const res = []
  for (let i = 0; i < length * 2; i++)
    res.push(ctsa.HEAPF64[addr / Float64Array.BYTES_PER_ELEMENT + i])
  return res
}

// method = 0 - Exact Maximum Likelihood Method (Default)
// method = 1 - Conditional Method - Sum Of Squares
// method = 2 - Box-Jenkins Method
// optimizer = 0 - Nelder-Mead
// optimizer = 1 - Newton Line Search
// optimizer = 2 - Newton Trust Region - Hook Step
// optimizer = 3 - Newton Trust Region - Double Dog-Leg
// optimizer = 4 - Conjugate Gradient
// optimizer = 5 - BFGS
// optimizer = 6 - Limited Memory BFGS
// optimizer = 7 - BFGS Using More Thuente Method (Default)
const arima_defaults = {
  method: 0,
  optimizer: 6,
  p: 1,
  d: 0,
  q: 1,
  verbose: true
}

// method = 0 - Exact Maximum Likelihood Method (Default)
// method = 1 - Conditional Method - Sum Of Squares
// method = 2 - Box-Jenkins Method
// optimizer = 0 - Nelder-Mead
// optimizer = 1 - Newton Line Search
// optimizer = 2 - Newton Trust Region - Hook Step
// optimizer = 3 - Newton Trust Region - Double Dog-Leg
// optimizer = 4 - Conjugate Gradient
// optimizer = 5 - BFGS
// optimizer = 6 - Limited Memory BFGS
// optimizer = 7 - BFGS Using More Thuente Method (Default)
const sarima_defaults = {
  method: 0,
  optimizer: 7,
  p: 0,
  d: 1,
  q: 1,
  s: 12,
  P: 0,
  D: 1,
  Q: 1,
  verbose: true
}

// method = 0 - Default Method
// method = 1 - FFT Based method.
const acf_defaults = {
  method: 0
}

// method = 0 - Yule-Walker
// method = 1 - Burg
// method = 2 - Conditional MLE (Box-Jenkins)
const pacf_defaults = {
  method: 0
}

module.exports = {
  ready: _promise,
  arima(input, length, opts) {
    const options = Object.assign({}, arima_defaults, opts)
    const ts = writedoublearray(input)
    const addr = _arima(
      ts,
      options.p,
      options.d,
      options.q,
      input.length,
      length,
      options.method,
      options.optimizer,
      options.verbose
    )
    return readdoublearray(addr, length)
  },
  sarima(input, length, opts) {
    const options = Object.assign({}, sarima_defaults, opts)
    const ts = writedoublearray(input)
    const addr = _sarima(
      ts,
      options.p,
      options.d,
      options.q,
      options.s,
      options.P,
      options.D,
      options.Q,
      input.length,
      length,
      options.method,
      options.optimizer,
      options.verbose
    )
    return readdoublearray(addr, length)
  },
  acf(input, length, opts) {
    if (length == null) length = input.length - 1
    const options = Object.assign({}, acf_defaults, opts)
    const ts = writedoublearray(input)
    const addr = _acf(
      ts,
      input.length,
      length,
      options.method
    )
    return readarray(addr, length)
  },
  pacf(input, length, opts) {
    if (length == null) length = input.length - 1
    const options = Object.assign({}, pacf_defaults, opts)
    const ts = writedoublearray(input)
    const addr = _pacf(
      ts,
      input.length,
      length,
      options.method
    )
    return readarray(addr, length)
  },
  // https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/diff
  // https://github.com/wch/r-source/blob/5a156a0865362bb8381dcd69ac335f5174a4f60c/src/library/base/R/diff.R
  diff(ts, lag = 1, differences = 1) {
    if (lag < 1 || differences < 1) return ts
    if (lag * differences >= ts.length) return []
    return seq(differences).reduce(result =>
      seq(result.length - lag).map((d, i) => result[i + lag] - result[i]),
      ts)
  }
}
