const initMeta = (type: 'life' | 'tech') => {
    return {
        rows:[
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'layout'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: 'post'
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'date'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: (new Date() as any).format('yyyy-MM-dd hh:mm:ss') + ' +0800'
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'categories'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: type,
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'path'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: `_posts/${type}/${(new Date() as any).format('yyyy')}/${(new Date() as any).format('yyyy-MM-dd')}-.md`
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'cos'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: `${(new Date() as any).format('yyyy')}/`
                        }
                    }
                ]
            },
            type === 'tech' && {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'header-style'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: 'text'
                        }
                    }
                ]
            },
            type === 'life' && {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'header-mask'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: '0.4'
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'tags'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: `-:${type === 'life' ? '生活' : '技术'}`
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'craft'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: ''
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'no-catalog'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: ''
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'callout'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: ''
                        }
                    }
                ]
            },
            {
                cells: [
                    {
                        block: {
                            type: 'textBlock',
                            content: 'reference'
                        }
                    },
                    {
                        block: {
                            type: 'textBlock',
                            content: ''
                        }
                    }
                ]
            }
        ].filter(Boolean)
    }
};

export {
    initMeta,
}