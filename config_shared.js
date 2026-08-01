module.exports = {
  physics: {
    dichotomyIterations: 3
  },
  // Safe to share with the browser (no secrets).
  physicalTicksPerSecond: 30,
  positionsSocketEmitsPerSecond: 20,
  userCommandsSentPerSecond: 20,
  myCarSpeed: 11,
  myCarTurnSpeed: Math.PI * 2
};
