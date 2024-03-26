export function zigzag (num: number): number {
  return (num << 1) ^ (num >> 31)
}

export function zagzig (num: number): number {
  return (num >> 1) ^ (-(num & 1))
}
