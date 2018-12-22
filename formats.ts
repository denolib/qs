const replace = String.prototype.replace
const percentTwenties = /%20/g

export const formats = {
  default: 'RFC3986',
  formatters: {
    RFC1738: (value: string) => replace.call(value, percentTwenties, '+'),
    RFC3986: (value: string) => value
  },
  RFC1738: 'RFC1738',
  RFC3986: 'RFC3986'
}
