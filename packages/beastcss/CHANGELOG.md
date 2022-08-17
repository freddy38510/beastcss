# Changelog

## [1.2.1](https://github.com/freddy38510/beastcss/compare/beastcss-v1.2.0...beastcss-v1.2.1) (2022-08-17)


### Bug Fixes

* expose types and do not include doc and license files in the package ([8dd745c](https://github.com/freddy38510/beastcss/commit/8dd745c460a7f93d37938ef7bc5137e1540215f7))

## [1.2.0](https://github.com/freddy38510/beastcss/compare/beastcss-v1.1.2...beastcss-v1.2.0) (2022-08-13)


### Features

* **beastcss:** add support for square brackets in class names ([65a1225](https://github.com/freddy38510/beastcss/commit/65a12257a94a685ebf27c892423d56116422cc8d))
* **beastcss:** set default "path" option to current working directory ([3e6f37d](https://github.com/freddy38510/beastcss/commit/3e6f37dbc68a0ac25b81953715bcba43550c669c))
* **beastcss:** update TypeScript declaration file ([9df2eaf](https://github.com/freddy38510/beastcss/commit/9df2eaf944f58633a3e639fa669714f4e947be36))

### [1.1.2](https://github.com/freddy38510/beastcss/compare/beastcss-v1.1.1...beastcss-v1.1.2) (2022-08-11)


### Bug Fixes

* **beastcss:** allow to omit parameter when instantiating the Beastcss class ([83de81a](https://github.com/freddy38510/beastcss/commit/83de81a963ec579979ef51ae272abf0a05ca97a9))

### [1.1.1](https://github.com/freddy38510/beastcss/compare/beastcss-v1.1.0...beastcss-v1.1.1) (2022-08-11)


### Bug Fixes

* **deps:** update dependency @freddy38510/dropcss to v2.4.0 ([#84](https://github.com/freddy38510/beastcss/issues/84)) ([fd0c94c](https://github.com/freddy38510/beastcss/commit/fd0c94cbd7a82b178811d8e89a73f123df7effae))

## [1.1.0](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.7...beastcss-v1.1.0) (2022-08-11)


### Features

* add Windi CSS support ([#65](https://github.com/freddy38510/beastcss/issues/65)) ([f0f8b34](https://github.com/freddy38510/beastcss/commit/f0f8b345f483481898f7f3d98d38384f8d9135d3))


### Bug Fixes

* **deps:** update dependency node-html-parser to v5.4.1 ([#73](https://github.com/freddy38510/beastcss/issues/73)) ([93d0f05](https://github.com/freddy38510/beastcss/commit/93d0f05a31df44a7f070142f5f2b399a0da9262f))

### [1.0.7](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.6...beastcss-v1.0.7) (2022-02-02)


### Bug Fixes

* **beastcss:** pass correct percentage to formatConcentration function ([0f54c3c](https://github.com/freddy38510/beastcss/commit/0f54c3c118984c5844990382b1dae22636e629f3))
* **beastcss:** stringify potential buffer from readed file ([9dfb787](https://github.com/freddy38510/beastcss/commit/9dfb787dd61a538a38c4d9174679f32cb6af0f13))
* **beastcss:** supports potential non-asynchronous functions of fs option ([3332afd](https://github.com/freddy38510/beastcss/commit/3332afdb85ec4b30b4203581ff08fe5b30451d46))
* **deps:** update dependency fast-glob to v3.2.11 ([#45](https://github.com/freddy38510/beastcss/issues/45)) ([d128cca](https://github.com/freddy38510/beastcss/commit/d128cca3f692af54c1760f240c9281f7fa296888))
* **deps:** update dependency node-html-parser to v5.2.0 ([#37](https://github.com/freddy38510/beastcss/issues/37)) ([c24ae89](https://github.com/freddy38510/beastcss/commit/c24ae89d6df27c93cd71e8ccf6fa7b1d3d356125))

### [1.0.6](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.5...beastcss-v1.0.6) (2021-12-21)


### Bug Fixes

* **deps:** update dependency @freddy38510/dropcss to v2.3.2 ([2b3515b](https://github.com/freddy38510/beastcss/commit/2b3515b49d14c01a5bdc09b5cafb67942f550612))
* **deps:** update dependency node-html-parser to v5.1.0 ([d64a708](https://github.com/freddy38510/beastcss/commit/d64a708e5687d5ad5d87ba7050ede680387b0cdd))

### [1.0.5](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.4...beastcss-v1.0.5) (2021-10-31)


### Bug Fixes

* **beastcss:** preload/async load external stylesheets even if no used css rules was found ([ee24563](https://github.com/freddy38510/beastcss/commit/ee245635990aa3b3418739686595c0a7f132ee4b))

### [1.0.4](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.3...beastcss-v1.0.4) (2021-10-18)


### Bug Fixes

* **deps:** update dependency node-html-parser to v5 ([#6](https://github.com/freddy38510/beastcss/issues/6)) ([8cee05b](https://github.com/freddy38510/beastcss/commit/8cee05b42a99e2410eca186a6f4637e2768264fd))

### [1.0.3](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.2...beastcss-v1.0.3) (2021-08-25)


### Bug Fixes

* bump @freddy38510/dropcss to v2.3.1 ([84db4e4](https://github.com/freddy38510/beastcss/commit/84db4e4608c9bddabf1dbae27f84d0b38c29c6ae))
* use fs.unlink instead of fs.rm which is only available since node v14.14 ([6fc4445](https://github.com/freddy38510/beastcss/commit/6fc44459404b2657ec143b6e5b965e1b2fefce8d))

### [1.0.2](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.1...beastcss-v1.0.2) (2021-08-24)


### Bug Fixes

* **beastcss:** add typing declaration file to distributable folder ([c68c917](https://github.com/freddy38510/beastcss/commit/c68c9179402a2850836c2bd87d1fb107cad8027a))

### [1.0.1](https://github.com/freddy38510/beastcss/compare/beastcss-v1.0.0...beastcss-v1.0.1) (2021-08-24)


### Bug Fixes

* use fs instead of fs/promises which is only available since nodejs@14 ([63d5b1e](https://github.com/freddy38510/beastcss/commit/63d5b1e7c4383b316e0fc8761c803f3f97a4cc9f))

## 1.0.0 (2021-08-24)
