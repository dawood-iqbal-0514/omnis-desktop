const { ModelManager } = require('./modelManager');
const { InferenceEngine } = require('./inference');

const modelManager = new ModelManager();
const inferenceEngine = new InferenceEngine(modelManager);

module.exports = {
  modelManager,
  inferenceEngine,
  ModelManager,
  InferenceEngine,
};
