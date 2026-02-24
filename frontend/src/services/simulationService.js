import api from './api';

export const simulationService = {
    runSimulation: (params) =>
        api.post('/api/simulation/run', null, { params }),

    compareThresholds: (params) =>
        api.post('/api/simulation/compare-thresholds', null, { params }),
};
