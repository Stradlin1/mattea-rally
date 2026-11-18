// Course geometry: each array is a distinct, closed, ordered loop in X/Z space.
// More control points are used for esses, switchbacks, chicanes and fast sweepers.
// Keeping these as authored coordinates (instead of weather variations) gives
// each stage its own repeatable layout for time-attack records.
export const TRACKS = [
  {
    id: 'pine', name: 'PINE VALLEY', detail: '森林 · S 弯 / 回头弯', seed: 1,
    road: 0x9f8062, field: 0x516f4c, sky: 0x9ab8c7, width: 19,
    points: [
      [-195,-40],[-203,-108],[-172,-166],[-111,-202],[-50,-188],
      [13,-148],[65,-174],[124,-177],[189,-137],[212,-78],
      [177,-28],[128,5],[165,48],[207,102],[172,162],
      [105,190],[37,170],[0,119],[-43,81],[-90,97],
      [-121,160],[-180,152],[-209,95],[-168,43],
      [-126,4],[-164,-4]
    ]
  },
  {
    id: 'snow', name: 'FROST RIDGE', detail: '雪山 · 连续发卡弯 / 山脊', seed: 2,
    road: 0x86959c, field: 0xc0cad0, sky: 0x96abc3, width: 17,
    points: [
      [-206,-93],[-170,-156],[-107,-194],[-34,-192],[34,-149],
      [94,-190],[179,-169],[212,-111],[170,-84],[111,-103],
      [58,-58],[129,-20],[202,23],[210,100],[157,158],
      [93,173],[39,121],[-3,64],[-49,77],[-66,142],
      [-144,185],[-201,134],[-188,66],[-125,31],
      [-72,-13],[-136,-49],[-186,-28]
    ]
  },
  {
    id: 'desert', name: 'RED CANYON', detail: '沙漠 · 长直道 / 连续变向', seed: 3,
    road: 0xc28d5a, field: 0xad7750, sky: 0xe2b28b, width: 21,
    points: [
      [-241,-94],[-220,-169],[-148,-206],[-57,-209],[22,-195],
      [109,-161],[204,-153],[242,-94],[213,-27],[156,-10],
      [119,27],[188,58],[229,107],[181,170],[104,210],
      [30,185],[-25,156],[-94,175],[-178,162],[-239,98],
      [-214,29],[-144,-8],[-87,-51],[-140,-104],[-206,-105]
    ]
  }
];
