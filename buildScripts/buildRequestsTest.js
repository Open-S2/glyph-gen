const arr = [32, 40, 41, 65, 67, 68, 69, 72, 73, 75, 77, 78, 83, 84, 87, 97, 99, 100, 101, 103, 104, 105, 107, 108, 109, 110, 111, 114, 115, 116, 117, 121, 3607, 3611, 3618, 3619, 3624, 3632, 3648, 3652, 20013, 20113, 20140, 20237, 20864, 21152, 21306, 21312, 21335, 21475, 22238, 22269, 22320, 22522, 22799, 23425, 23454, 23736, 24029, 24052, 25511, 26031, 26032, 26041, 26063, 26187, 26690, 27835, 27941, 27993, 28023, 28189, 28207, 28248, 28595, 29577, 29976, 30333, 30358, 30465, 31908, 33258, 33487, 34255, 35199, 35947, 36195, 37122, 37324, 38272, 38397, 38485, 38738, 40065, 40660, 64510, 65165, 65198, 65253]

console.log(buildRequests(arr))

function buildRequests (list) {
  // const { glyphMap } = this
  const requests = []
  const chunks = []
  // group into batches of 35
  for (let i = 0; i < list.length; i += 35) chunks.push(list.slice(i, i + 35))
  console.log(chunks)
  // group unicode numbers adjacent into the same range

  return requests
}
