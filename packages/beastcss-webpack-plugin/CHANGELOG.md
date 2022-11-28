# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * beastcss bumped from ^2.0.0 to ^2.0.1

## [2.1.0](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v2.0.1...beastcss-webpack-plugin-v2.1.0) (2022-11-28)


### Features

* add an option to remove style tags once external stylesheet is loaded ([04839e2](https://github.com/freddy38510/beastcss/commit/04839e2344a72793dfae43ff7952ee861d1dfd37))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * beastcss bumped from ^2.0.1 to ^2.1.0

## [2.0.0](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.11...beastcss-webpack-plugin-v2.0.0) (2022-09-26)


### ⚠ BREAKING CHANGES

* do not add a noscript tag by default
* drop webpack 4 support

### Features

* add more logging and improve some of it ([52c42b4](https://github.com/freddy38510/beastcss/commit/52c42b479fafc9d9a6aa588120015fbfa8df8f47))
* do not add a noscript tag by default ([ab407e8](https://github.com/freddy38510/beastcss/commit/ab407e89e29f6e7ece769da2031df77c5f2e8936))
* exclude remote stylesheets and rework exclusion logic for better robustness ([ea879f0](https://github.com/freddy38510/beastcss/commit/ea879f0e4cdb99d8201d0281375f75fc5cf98703))
* handle logging with webpack infrastructure logger ([1da01eb](https://github.com/freddy38510/beastcss/commit/1da01ebd661096fd4473e4b67a8260991678fe89))
* supports excluding additional stylesheets ([08d363c](https://github.com/freddy38510/beastcss/commit/08d363c2949e5d203bf97e4fe3b903202b60424c))


### Bug Fixes

* ensure to process each html asset only once ([7c372ab](https://github.com/freddy38510/beastcss/commit/7c372ab7e9cb5c5a86c797598cb1fc76882127e0))
* get additional stylesheets from filesystem in addition to webpack assets ([9cfb190](https://github.com/freddy38510/beastcss/commit/9cfb1900f13fc1f8fcd38ef9646d78903e94f212))
* process all html assets and prune stylesheet sources at the right time ([5c201d0](https://github.com/freddy38510/beastcss/commit/5c201d04860aea56be90282af4a472c0f060eac9))
* set fs property with webpack output filesystem when available if no fs option is passed ([c2caed5](https://github.com/freddy38510/beastcss/commit/c2caed54ac6f1f0d856c1f2fa1bb8d03af902f96))


### Performance Improvements

* caches the content of external stylesheets as a buffer instead of a string ([ec8f6ba](https://github.com/freddy38510/beastcss/commit/ec8f6ba204bc98a1485b7cf6b815968933def8f3))


### Code Refactoring

* drop webpack 4 support ([164ef2d](https://github.com/freddy38510/beastcss/commit/164ef2d9943cf2a107389e347639dc5b1925d4c9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * beastcss bumped from ^1.2.1 to ^2.0.0

## [1.0.11](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.10...beastcss-webpack-plugin-v1.0.11) (2022-08-17)


### Bug Fixes

* expose types and do not include doc and license files in the package ([8dd745c](https://github.com/freddy38510/beastcss/commit/8dd745c460a7f93d37938ef7bc5137e1540215f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * beastcss bumped from 1.2.0 to ^1.2.1

### [1.0.10](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.9...beastcss-webpack-plugin-v1.0.10) (2022-08-13)


### Bug Fixes

* **beastcss-webpack-plugin:** update dependency beastcss to v1.2.0 ([8171006](https://github.com/freddy38510/beastcss/commit/81710065aa6851af101e389ac1d2ae021289585d))

### [1.0.9](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.8...beastcss-webpack-plugin-v1.0.9) (2022-08-11)


### Bug Fixes

* **beastcss-webpack-plugin:** update dependency beastcss to v1.1.2 ([9623c60](https://github.com/freddy38510/beastcss/commit/9623c6043d128c9196938ef75b35d8fb615b20a0))

### [1.0.8](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.7...beastcss-webpack-plugin-v1.0.8) (2022-08-11)


### Bug Fixes

* **beastcss-webpack-plugin:** update dependency beastcss to v1.1.1 ([46ac133](https://github.com/freddy38510/beastcss/commit/46ac1335d14451bd3d2e1df3c6c56ad42fb2c73f))
* **deps:** update dependency micromatch to v4.0.5 ([#68](https://github.com/freddy38510/beastcss/issues/68)) ([7c8f67e](https://github.com/freddy38510/beastcss/commit/7c8f67e23c95faf0f860e6ca4687046e66f47327))

### [1.0.7](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.6...beastcss-webpack-plugin-v1.0.7) (2022-02-02)


### Bug Fixes

* **beastcss-webpack-plugin:** update dependency beastcss to v1.0.7 ([e683f4b](https://github.com/freddy38510/beastcss/commit/e683f4b3f70d01871aa07fff72f755f48a77f5a8))
* **deps:** update dependency webpack-sources to v3.2.3 ([#46](https://github.com/freddy38510/beastcss/issues/46)) ([5d8db6d](https://github.com/freddy38510/beastcss/commit/5d8db6d3f6952ece2e549e41dca9bbc468f3709f))

### [1.0.6](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.5...beastcss-webpack-plugin-v1.0.6) (2021-12-21)


### Bug Fixes

* **beastcss-webpack-plugin:** update dependency beastcss to v1.0.6 ([86cae31](https://github.com/freddy38510/beastcss/commit/86cae31bd3693395e55622e125e36b2a845b2cdf))
* **deps:** update dependency schema-utils to v4.0.0 ([9f47061](https://github.com/freddy38510/beastcss/commit/9f4706176308a8980f397308a40e70a0375bde20))
* **deps:** update dependency webpack-sources to v3.2.2 ([cfeeb94](https://github.com/freddy38510/beastcss/commit/cfeeb94b8b1c9d9a678b53f8e571a2495b9c7ec6))

### [1.0.5](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.4...beastcss-webpack-plugin-v1.0.5) (2021-10-31)


### Bug Fixes

* **beastcss-webpack-plugin:** update dependency beastcss to v1.0.5 ([6f0a9ba](https://github.com/freddy38510/beastcss/commit/6f0a9ba74d865496d028ae29ab30cecc44250d1f))

### [1.0.4](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.3...beastcss-webpack-plugin-v1.0.4) (2021-10-18)


### Bug Fixes

* **beastcss-webpack-plugin:** update dependency beastcss to v1.0.4 ([4ca1dc1](https://github.com/freddy38510/beastcss/commit/4ca1dc154ec0d3e1cb4370332da3d6fea9d10a94))
* **beastcss-webpack-plugin:** update dependency webpack-sources to v3.2.1 ([2357c63](https://github.com/freddy38510/beastcss/commit/2357c635f4bc0fb751bba7990e5569a5bcd12cb6))

### [1.0.3](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.2...beastcss-webpack-plugin-v1.0.3) (2021-08-25)


### Bug Fixes

* **beastcss-webpack-plugin:** bump beastcss to v1.0.3 ([da2b0ac](https://github.com/freddy38510/beastcss/commit/da2b0ac3e1ef983de2e71c6e5a5b0a047a538e26))

### [1.0.2](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.1...beastcss-webpack-plugin-v1.0.2) (2021-08-24)


### Bug Fixes

* **beastcss-webpack-plugin:** add typing declaration file to distributable folder ([5a16ef4](https://github.com/freddy38510/beastcss/commit/5a16ef4b0790cdda966ddfce0453c9b63fa0a989))
* **beastcss-webpack-plugin:** bump beastcss to v1.0.2 ([bd0a817](https://github.com/freddy38510/beastcss/commit/bd0a81789221d74c675e3af657c179a482d6eac6))

### [1.0.1](https://github.com/freddy38510/beastcss/compare/beastcss-webpack-plugin-v1.0.0...beastcss-webpack-plugin-v1.0.1) (2021-08-24)


### Bug Fixes

* **beastcss-webpack-plugin:** bump beastcss to v1.0.1 ([5a89879](https://github.com/freddy38510/beastcss/commit/5a8987941b22ca8762cb58c640554fd170614297))
* use fs instead of fs/promises which is only available since nodejs@14 ([63d5b1e](https://github.com/freddy38510/beastcss/commit/63d5b1e7c4383b316e0fc8761c803f3f97a4cc9f))

## 1.0.0 (2021-08-24)
