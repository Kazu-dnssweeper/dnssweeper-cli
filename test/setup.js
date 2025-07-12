"use strict";
process.env.TZ = 'Asia/Tokyo';
jest.mock('chalk', () => ({
    __esModule: true,
    default: {
        blue: (str) => str,
        red: (str) => str,
        green: (str) => str,
        yellow: (str) => str,
        gray: (str) => str,
        white: (str) => str,
        redBright: (str) => str,
    },
}));
jest.mock('ora', () => ({
    __esModule: true,
    default: (text) => ({
        start: () => ({
            text,
            succeed: (_message) => { },
            fail: (_message) => { },
        }),
    }),
}));
//# sourceMappingURL=setup.js.map