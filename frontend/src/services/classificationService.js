import api from './api';

export const classificationService = {
    train: () => api.post('/api/classification/train'),

    predict: (sample) => api.post('/api/classification/predict', null, { params: sample }),

    getConfusionMatrix: (modelType = 'random_forest') =>
        api.get('/api/classification/confusion-matrix', { params: { model_type: modelType } }),

    getRecyclingStats: () => api.get('/api/classification/recycling-stats'),
};
