import chai from 'chai'
import * as f from '../src/'
import _ from 'lodash/fp'
chai.expect()
const expect = chai.expect

describe('Algebras', () => {
    it('map arrays', () => {
        expect(f.map(x => x * x, [ 1, 2, 3 ])).to.deep.equal([ 1, 4, 9 ])
    })

    it('map plain objects', () => {
        expect(f.map(x => x * x, { a: 1, b: 2, c: 3 })).to.deep.equal({ a: 1, b: 4, c: 9 })
    })

    it('deepMap arrays', () => {
        const arr = [ 0, [ 1, [ 2, [ ] ] ] ]

        const arrBackup = _.cloneDeep(arr)

        const arrMutated = f.deepMap(e => e.concat(101), arr)

        // Checking immutability
        expect(arr).to.eql(arrBackup)

        expect(arrMutated).to.eql([ 0, [ 1, [ 2, [ 101 ], 101 ], 101 ] ])
    })

    it('deepMap plain objects', () => {
        const obj = {
            a: {
                match: {
                    id: 1
                },
                b: {
                    match: {
                        id: 2
                    },
                    c: {
                        match: {
                            id: 3
                        }
                    }
                }
            }
        }

        const objBackup = _.cloneDeep(obj)

        const path = 'match.matched'
        const setMatched = e => e.match && _.set(path, true, e)
        const objMutated = f.deepMap(e => setMatched(e) || e)(obj)

        // Checking immutability
        expect(obj).to.eql(objBackup)

        expect(objMutated).to.eql({
            a: {
                match: {
                    id: 1,
                    matched: true
                },
                b: {
                    match: {
                        id: 2,
                        matched: true
                    },
                    c: {
                        match: {
                            id: 3,
                            matched: true
                        }
                    }
                }
            }
        })
    })

    it('deepMap plain objects with arrays with objects', () => {
        const obj = {
            a: {
                array: [ 0, [ 1, [ 2, [ { match: { id: 0 } } ] ] ] ],
                match: {
                    id: 1
                },
                b: {
                    match: {
                        id: 2
                    },
                    c: {
                        match: {
                            id: 3
                        }
                    }
                }
            }
        }

        const objBackup = _.cloneDeep(obj)

        const path = 'match.matched'
        const setMatched = e => e.match && _.set(path, true, e)
        const push101 = e => _.isArray(e) && e.concat(101)
        const objMutated = f.deepMap(e => push101(e) || setMatched(e) || e)(obj)

        // Checking immutability
        expect(obj).to.eql(objBackup)

        expect(objMutated).to.eql({
            a: {
                array: [ 0, [ 1, [ 2, [ { match: { id: 0, matched: true } }, 101 ], 101 ], 101 ], 101 ],
                match: {
                    id: 1,
                    matched: true
                },
                b: {
                    match: {
                        id: 2,
                        matched: true
                    },
                    c: {
                        match: {
                            id: 3,
                            matched: true
                        }
                    }
                }
            }
        })
    })

    it('groupoid for variable accumulator', () => {
        // Count until
        expect(f.groupoid(acc => acc < 3, acc => ++acc)([ 1, 2, 3, 4 ], 0)).to.equal(3)
        // Process number until
        expect(f.groupoid(
            x => x + 1,
            x => x * x * x,
            x => x / 2,
            x => x < 1000
        )('128023.9375'.split(''), 1)).to.equal(128023.9375)
        // Process string until
        expect(f.groupoid(
            s => (x => x < 1000 && x)(parseFloat(s)),
            x => x + 1,
            x => x * x * x,
            x => x / 2,
            x => `${x}`
        )('128023.9375'.split(''), '1')).to.equal('128023.9375')
    })

    it('groupoid simple test', () => {
        const target = {
            N1: [ {
                N2: [ { N21: [ 210 ], N22: [ 220 ] } ],
                N4: [ { N41: [ 410 ], N42: [ 420 ] } ],
                N6: [ { N61: [ 610 ], N62: [ 620 ] } ],
                N8: [ { N81: [ 810 ], N82: [ 820 ] } ]
            }, {
                N3: [ { N31: [ 310 ], N32: [ 320 ] } ],
                N5: [ { N51: [ 510 ], N52: [ 520 ] } ],
                N7: [ { N71: [ 710 ], N72: [ 720 ] } ],
                N9: [ { N91: [ 910 ], N92: [ 920 ] } ]
            } ]
        }

        const keyToInt = key => parseInt(key.slice(1))
        const concatIfPair = (key, acc) => (key % 2 === 0) ? acc.concat(key) : acc

        let pairKeys = f.groupoid((acc, val, key) => concatIfPair(keyToInt(key), acc))(target)

        expect(pairKeys).to.deep.equal([ 2, 22, 4, 42, 6, 62, 8, 82, 32, 52, 72, 92 ])

        pairKeys = f.groupoid(
            acc => acc.length < 4,
            (acc, val, key) => concatIfPair(keyToInt(key), acc)
        )(target)

        expect(pairKeys).to.deep.equal([ 2, 22, 4, 42 ])
    })

    it('groupoid for nested objects', () => {
        const target = {
            something: {
                mostly_empty: {}
            },
            deep: {
                object: {
                    matching: {
                        key: 'value'
                    }
                }
            }
        }

        let found = f.groupoid(
            acc => acc.length < 2,
            (acc, val, key) => key === 'matching' ? acc.concat({ [key]: val }) : acc
        )(target)

        expect(found).to.deep.equal([{
            matching: { key: 'value' }
        }])
    })

    it('groupoid doesn\'t stop with objects with null and undefined properties', () => {
        const target = {
            something: {
                mostly_empty: {},
                empty_property: null,
                empty_property2: undefined,
                some_empty_values: [
                    null,
                    undefined,
                    {
                        matching: {
                            key: 'value1'
                        }
                    }
                ]
            },
            empty_property: null,
            empty_property2: undefined,
            some_empty_values: [
                null,
                undefined,
                {
                    matching: {
                        key: 'value2'
                    }
                }
            ],
            deep: {
                object: {
                    matching: {
                        key: 'value3'
                    },
                    empty_property: null,
                    empty_property2: undefined,
                    some_empty_values: [
                        null,
                        undefined,
                        {
                            matching: {
                                key: 'value4'
                            }
                        }
                    ]
                }
            }
        }

        let found = f.groupoid(
            acc => acc.length < 3,
            (acc, val, key) => key === 'matching' ? acc.concat({ [key]: val }) : acc
        )(target)

        expect(found).to.deep.equal([{
            matching: { key: 'value1' }
        }, {
            matching: { key: 'value2' }
        }, {
            matching: { key: 'value3' }
        }])
    })

    it('groupoid for nested objects, ignoring fields', () => {
        const target = {
            something: {
                mostly_empty: {}
            },
            deep: {
                object1: {
                    matching: {
                        key: 'value'
                    },
                    deeper: {
                        object: {
                            matching: {
                                key: 'value',
                                ignore: true
                            }
                        }
                    }
                },
                object2: {
                    matching: {
                        key: 'value',
                        ignore: true
                    },
                    deeper: {
                        object: {
                            matching: {
                                key: 'value'
                            }
                        }
                    }
                }
            }
        }

        let found = f.groupoid(
            acc => acc.length < 2,
            (acc, val, key) => (key === 'matching' && val && !val.ignore) ? acc.concat({ [key]: val }) : acc
        )(target)

        expect(found).to.deep.equal([{
            matching: { key: 'value' }
        }, {
            matching: { key: 'value' }
        }])

        for (let v of found) {
            v.matching.modified = true
        }

        found = f.groupoid(
            acc => acc.length < 2,
            (acc, val, key) => (key === 'matching' && val && !val.ignore) ? acc.concat({ [key]: val }) : acc
        )(target)

        expect(found).to.deep.equal([{
            matching: {
                key: 'value',
                modified: true
            }
        }, {
            matching: {
                key: 'value',
                modified: true
            }
        }])
    })

    it('implementation of getPath with groupoids', () => {
        let path = ['x', 'y', 'z']
        let obj = {
            key: 'root',
            items: [{
                key: 'x',
                items: [{
                    key: 'y',
                    items: [{
                        key: 'z',
                        extra: 'blah'
                    }, {
                        key: 's'
                    }]
                }]
            }]
        }

        const getPath = _.reduce((acc, k) => f.groupoid(
            (a, b) => _.get('key', b) === k ? b : a,
            a => a && !a.key
        )(acc, null))

        expect(getPath(obj, path)).to.deep.equal({
            key: 'z',
            extra: 'blah'
        })

        expect(getPath(obj, ['a'])).to.be.null
    })
})
