import './workerPath.js'
import * as api from '../converters/index.js'

export { convert, detectFormat, listConversions, targetsFor, FORMATS } from '../converters/index.js'

// Also expose a global for consumers loading via <script type="module" src>
if (typeof window !== 'undefined') {
  window.FormatConvert = api
}
