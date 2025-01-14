const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const cssToReactNativeMap = {
    'background': 'background',
    'background-color': 'backgroundColor',
    'color': 'color',
    'display': 'display',
    'font-size': 'fontSize',
    'font-family': 'fontFamily',
    'font-weight': 'fontWeight',
    'flex-direction': 'flexDirection',
    'justify-content': 'justifyContent',
    'justify-items': 'justifyItems',
    'align-items': 'alignItems',
    'padding': 'padding',
    'padding-top': 'paddingTop',
    'padding-bottom': 'paddingBottom',
    'padding-left': 'paddingLeft',
    'padding-right': 'paddingRight',
    'margin': 'margin',
    'margin-top': 'marginTop',
    'margin-bottom': 'marginBottom',
    'margin-left': 'marginLeft',
    'margin-right': 'marginRight',
    'border-radius': 'borderRadius',
    'border': 'border',
    'height': 'height',
    'width': 'width',
    'position': 'position',
    'top': 'top',
    'left': 'left',
    'right': 'right',
    'bottom': 'bottom',
    'cursor': '',
};

const knownReactNativeProperties = new Set([
    'display',
    'flexDirection',
    'maxWidth',
    'maxHeight',
    'backgroundColor',
    'background',
    'color',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'justifyContent',
    'alignItems',
    'padding',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'margin',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'borderRadius',
    'border',
    'height',
    'width',
    'position',
    'top',
    'left',
    'right',
    'bottom',
    'textAlign',
    'minWidth',
    'minHeight',
    'overflowY',
    'boxShadow',
]);

/* Преобразует объект стилей в RN-совместимый объект */
function transformStyleObject(styleObject) {
    const transformedStyle = {};
    for (const [key, value] of Object.entries(styleObject)) {
        const camelCaseKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        let reactNativeKey = cssToReactNativeMap[key] || camelCaseKey;
        if (!cssToReactNativeMap[key] && !knownReactNativeProperties.has(camelCaseKey)) {
            continue;
        }
        let transformedValue = value;
        if (reactNativeKey === 'background') {
            reactNativeKey = 'backgroundColor';
        }
        if (typeof value === 'string' && value.endsWith('px')) {
            transformedValue = parseFloat(value.replace('px', ''));
        } else if (typeof value === 'string' && value.endsWith('vh')) {
            if (reactNativeKey === 'height') {
                transformedStyle.flex = 1;
                continue;
            }
        } else if (typeof value === 'string' && value.endsWith('vw')) {
            if (reactNativeKey === 'width') {
                transformedStyle.flex = 1;
                continue;
            }
        }
        transformedStyle[reactNativeKey] = transformedValue;
    }
    return transformedStyle;
}

/* Преобразует объект стилей в AST-формат для React Native */
function transformStyleObjectInAST(styleObject) {
    const transformedStyle = {};
    for (const [key, value] of Object.entries(styleObject)) {
        const camelCaseKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        let reactNativeKey = cssToReactNativeMap[key] || camelCaseKey;
        if (!cssToReactNativeMap[key] && !knownReactNativeProperties.has(camelCaseKey)) {
            continue;
        }
        if (reactNativeKey === 'background') {
            reactNativeKey = 'backgroundColor';
        }
        if (typeof value === 'string' && value.endsWith('px')) {
            const numericVal = parseFloat(value.replace('px', ''));
            transformedStyle[reactNativeKey] = numericVal;
            continue;
        }
        if (typeof value === 'string' && value.endsWith('vh') && reactNativeKey === 'height') {
            transformedStyle.flex = 1;
            continue;
        }
        if (typeof value === 'string' && value.endsWith('vw') && reactNativeKey === 'width') {
            transformedStyle.flex = 1;
            continue;
        }
        if (typeof value === 'string') {
            transformedStyle[reactNativeKey] = value;
            continue;
        }
        transformedStyle[reactNativeKey] = value;
    }
    return transformedStyle;
}

/* Преобразует импорты для совместимости с Expo */
function transformImports(path) {
    const importPath = path.node.source.value;
    if (importPath === 'react') {
        return;
    }
    if (importPath === 'react-router-dom') {
        path.node.source = t.stringLiteral('expo-router');
        const specifiers = path.node.specifiers.map(spec => {
            if (spec.imported && spec.imported.name === 'useNavigate') {
                return t.importSpecifier(t.identifier('useRouter'), t.identifier('useRouter'));
            }
            return spec;
        });
        path.node.specifiers = specifiers;
        return;
    }
    if (importPath.endsWith('.css')) {
        path.remove();
        return;
    }
    if (importPath === 'react-native') {
        const hasStyleSheet = path.node.specifiers.some(
            spec => spec.imported && spec.imported.name === 'StyleSheet'
        );
        if (!hasStyleSheet) {
            path.node.specifiers.push(
                t.importSpecifier(t.identifier('StyleSheet'), t.identifier('StyleSheet'))
            );
        }
        return;
    }
    if (importPath.endsWith('.svg')) {
        const svgName = path.node.specifiers[0].local.name;
        path.node.specifiers = [
            t.importDefaultSpecifier(t.identifier(svgName))
        ];
        path.node.source = t.stringLiteral(
            `../assets/images/${path.node.source.value.split('/').slice(-2).join('/')}`
        );
    }
}

/* Преобразует JSX-элементы в компоненты React Native */
function transformJSX(path) {
    const openingElement = path.node.openingElement;
    const tagName = openingElement.name.name;
    const tagMapping = {
        div: 'View',
        button: 'TouchableOpacity',
        img: 'Image',
        span: 'Text',
        input: 'TextInput',
    };
    if (tagMapping[tagName]) {
        openingElement.name.name = tagMapping[tagName];
        if (path.node.closingElement) {
            path.node.closingElement.name.name = tagMapping[tagName];
        }
    }
    openingElement.attributes = openingElement.attributes.map((attr) => {
        if (attr.name && attr.name.name === 'className') {
            const classNames = attr.value.value.split(' ');
            const styleExpressions = classNames.map(cls =>
                t.memberExpression(
                    t.identifier('styles'),
                    t.identifier(cls.charAt(0).toUpperCase() + cls.slice(1))
                )
            );
            let styleValue = null;
            if (styleExpressions.length === 1) {
                styleValue = styleExpressions[0];
            } else {
                styleValue = t.arrayExpression(styleExpressions);
            }
            return t.jsxAttribute(
                t.jsxIdentifier('style'),
                t.jsxExpressionContainer(styleValue)
            );
        }
        if (attr.name && attr.name.name === 'onClick') {
            if (tagMapping[tagName] === 'TouchableOpacity') {
                return t.jsxAttribute(
                    t.jsxIdentifier('onPress'),
                    attr.value
                );
            }
        }
        if (attr.name && attr.name.name === 'onChange') {
            if (tagMapping[tagName] === 'TextInput') {
                return t.jsxAttribute(
                    t.jsxIdentifier('onChangeText'),
                    attr.value
                );
            }
        }
        return attr;
    });
    path.traverse({
        CallExpression(innerPath) {
            const callee = innerPath.node.callee;
            if (t.isIdentifier(callee, { name: 'navigate' })) {
                innerPath.node.callee = t.memberExpression(
                    t.identifier('router'),
                    t.identifier('navigate')
                );
            }
        }
    });
}

/* Трансформирует хук useNavigate в useRouter */
function transformHooks(path) {
    if (path.isVariableDeclarator()) {
        if (path.node.init && path.node.init.callee && path.node.init.callee.name === 'useNavigate') {
            path.node.init.callee.name = 'useRouter';
            path.node.id.name = 'router';
        }
    }
}

/* Генерирует StyleSheet.create(...) из объекта styles */
function generateStyleSheet(ast) {
    let stylesObject = null;
    traverse(ast, {
        VariableDeclarator(path) {
            if (path.node.id.name === 'styles' && t.isObjectExpression(path.node.init)) {
                stylesObject = path.node.init;
                path.remove();
            }
        },
    });
    if (stylesObject) {
        const transformedStyles = {};
        stylesObject.properties.forEach((property) => {
            if (
                t.isObjectProperty(property) &&
                (t.isIdentifier(property.key) || t.isStringLiteral(property.key)) &&
                t.isObjectExpression(property.value)
            ) {
                const styleName = t.isIdentifier(property.key)
                    ? property.key.name
                    : property.key.value;
                const styleValue = property.value.properties.reduce((acc, prop) => {
                    if (t.isObjectProperty(prop)) {
                        const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
                        let value = null;
                        if (t.isStringLiteral(prop.value)) {
                            value = prop.value.value;
                        } else if (t.isNumericLiteral(prop.value)) {
                            value = prop.value.value;
                        } else if (
                            t.isIdentifier(prop.value) ||
                            t.isTemplateLiteral(prop.value) ||
                            t.isBinaryExpression(prop.value) ||
                            t.isConditionalExpression(prop.value) ||
                            t.isLogicalExpression(prop.value) ||
                            t.isCallExpression(prop.value) ||
                            t.isArrowFunctionExpression(prop.value) ||
                            t.isFunctionExpression(prop.value)
                        ) {
                            value = prop.value;
                        } else {
                            value = null;
                        }
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                const transformedStyleObj = transformStyleObjectInAST(styleValue);
                if (Object.keys(transformedStyleObj).length > 0) {
                    transformedStyles[styleName] = transformedStyleObj;
                }
            }
        });
        const styleProperties = Object.entries(transformedStyles).map(([key, value]) => {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const styleObjProps = Object.entries(value).map(([k, v]) => {
                    if (typeof v === 'number') {
                        return t.objectProperty(t.identifier(k), t.numericLiteral(v));
                    } else if (typeof v === 'string') {
                        return t.objectProperty(t.identifier(k), t.stringLiteral(v));
                    } else if (t.isExpression(v)) {
                        return t.objectProperty(t.identifier(k), v);
                    } else {
                        return t.objectProperty(t.identifier(k), t.nullLiteral());
                    }
                });
                return t.objectProperty(
                    t.identifier(key),
                    t.objectExpression(styleObjProps)
                );
            }
            return null;
        }).filter(Boolean);
        const styleSheetCreate = t.callExpression(
            t.memberExpression(t.identifier('StyleSheet'), t.identifier('create')),
            [t.objectExpression(styleProperties)]
        );
        const stylesVariable = t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier('styles'), styleSheetCreate),
        ]);
        ast.program.body.push(stylesVariable);
    } else {
        const styleSheet = t.variableDeclaration('const', [
            t.variableDeclarator(
                t.identifier('styles'),
                t.callExpression(
                    t.memberExpression(t.identifier('StyleSheet'), t.identifier('create')),
                    [t.objectExpression([])]
                )
            ),
        ]);
        ast.program.body.push(styleSheet);
    }
}

/* Добавляет дополнительные импорты SecureStore и useFonts */
function addAdditionalImports(ast) {
    let hasSecureStoreImport = false;
    let hasUseFontsImport = false;
    traverse(ast, {
        ImportDeclaration(path) {
            if (path.node.source.value === 'expo-secure-store') {
                hasSecureStoreImport = true;
            }
            if (path.node.source.value === 'expo-font') {
                hasUseFontsImport = true;
            }
        }
    });
    if (!hasSecureStoreImport) {
        const secureStoreImport = t.importDeclaration(
            [t.importNamespaceSpecifier(t.identifier('SecureStore'))],
            t.stringLiteral('expo-secure-store')
        );
        ast.program.body.unshift(secureStoreImport);
    }
    if (!hasUseFontsImport) {
        const useFontsImport = t.importDeclaration(
            [t.importSpecifier(t.identifier('useFonts'), t.identifier('useFonts'))],
            t.stringLiteral('expo-font')
        );
        ast.program.body.unshift(useFontsImport);
    }
}

/* Добавляет интерфейс Transaction для TypeScript */
function addTypeInterfaces(ast) {
    const transactionInterface = t.tsInterfaceDeclaration(
        t.identifier('Transaction'),
        null,
        [],
        t.tsInterfaceBody([
            t.tsPropertySignature(
                t.identifier('type'),
                t.tsTypeAnnotation(
                    t.tsUnionType([
                        t.tsLiteralType(t.stringLiteral('deposit')),
                        t.tsLiteralType(t.stringLiteral('withdraw')),
                        t.tsLiteralType(t.stringLiteral('message')),
                    ])
                )
            ),
            t.tsPropertySignature(
                t.identifier('amount'),
                t.tsTypeAnnotation(t.tsNumberKeyword())
            ),
            t.tsPropertySignature(
                t.identifier('timeSpan'),
                t.tsTypeAnnotation(t.tsStringKeyword())
            ),
            t.tsPropertySignature(
                t.identifier('direction'),
                t.tsTypeAnnotation(
                    t.tsUnionType([
                        t.tsLiteralType(t.stringLiteral('incoming')),
                        t.tsLiteralType(t.stringLiteral('outgoing')),
                    ])
                )
            ),
            t.tsPropertySignature(
                t.identifier('description'),
                t.tsTypeAnnotation(
                    t.tsUnionType([
                        t.tsStringKeyword(),
                        t.tsUndefinedKeyword(),
                    ])
                )
            ),
            t.tsPropertySignature(
                t.identifier('message'),
                t.tsTypeAnnotation(
                    t.tsUnionType([
                        t.tsTypeLiteral([
                            t.tsPropertySignature(
                                t.identifier('content'),
                                t.tsTypeAnnotation(t.tsStringKeyword())
                            ),
                        ]),
                        t.tsUndefinedKeyword(),
                    ])
                )
            ),
        ])
    );
    let lastImportIndex = -1;
    ast.program.body.forEach((node, index) => {
        if (t.isImportDeclaration(node)) {
            lastImportIndex = index;
        }
    });
    ast.program.body.splice(lastImportIndex + 1, 0, transactionInterface);
}

/* Добавляет загрузку шрифтов useFonts(...) в компонентах WalletScreen и Balance */
function addFontLoading(ast) {
    traverse(ast, {
        FunctionDeclaration(path) {
            if (path.node.id.name === 'WalletScreen' || path.node.id.name === 'Balance') {
                const existingFontsLoaded = path.node.body.body.find(node =>
                    t.isVariableDeclaration(node) &&
                    node.declarations.some(decl => decl.id.name === 'fontsLoaded')
                );
                if (!existingFontsLoaded) {
                    const useFontsCall = t.variableDeclaration('const', [
                        t.variableDeclarator(
                            t.arrayPattern([t.identifier('fontsLoaded')]),
                            t.callExpression(t.identifier('useFonts'), [
                                t.objectExpression([
                                    t.objectProperty(
                                        t.stringLiteral('Poppins-Regular'),
                                        t.callExpression(t.identifier('require'), [
                                            t.stringLiteral('../assets/fonts/Poppins-Regular.ttf')
                                        ])
                                    ),
                                    t.objectProperty(
                                        t.stringLiteral('Poppins-Light'),
                                        t.callExpression(t.identifier('require'), [
                                            t.stringLiteral('../assets/fonts/Poppins-Light.ttf')
                                        ])
                                    ),
                                    t.objectProperty(
                                        t.stringLiteral('Poppins-Medium'),
                                        t.callExpression(t.identifier('require'), [
                                            t.stringLiteral('../assets/fonts/Poppins-Medium.ttf')
                                        ])
                                    ),
                                    t.objectProperty(
                                        t.stringLiteral('Poppins-Bold'),
                                        t.callExpression(t.identifier('require'), [
                                            t.stringLiteral('../assets/fonts/Poppins-Bold.ttf')
                                        ])
                                    )
                                ])
                            ])
                        )
                    ]);
                    path.node.body.body.unshift(useFontsCall);
                }
            }
        }
    });
}

/* Заменяет localStorage на SecureStore */
function replaceLocalStorage(path) {
    if (
        t.isMemberExpression(path.node.callee) &&
        path.node.callee.object.name === 'localStorage' &&
        path.node.callee.property.name === 'getItem'
    ) {
        path.node.callee = t.memberExpression(t.identifier('SecureStore'), t.identifier('getItem'));
    }
}

/* Собирает данные о компонентах React Native, которые реально используются */
function collectUsedReactNativeComponents(ast) {
    const usedComponents = new Set();
    traverse(ast, {
        JSXElement(path) {
            const openingElement = path.node.openingElement;
            if (t.isJSXIdentifier(openingElement.name)) {
                const tagName = openingElement.name.name;
                if (['View','Text','TextInput','TouchableOpacity','FlatList','ScrollView','Alert','Image'].includes(tagName)) {
                    usedComponents.add(tagName).add('StyleSheet');
                }
            }
        },
        Identifier(path) {
            if (path.node.name === 'Alert') {
                usedComponents.add('Alert');
            }
            if (path.node.name === 'FlatList') {
                usedComponents.add('FlatList');
            }
        },
    });
    return usedComponents;
}

/* Добавляет недостающие импорты из react-native */
function ensureReactNativeImports(ast, usedComponents) {
    let importDeclarationPath = null;
    traverse(ast, {
        ImportDeclaration(path) {
            if (path.node.source.value === 'react-native') {
                importDeclarationPath = path;
                path.stop();
            }
        }
    });
    if (!importDeclarationPath) {
        const newImport = t.importDeclaration(
            Array.from(usedComponents).map((cmp) =>
                t.importSpecifier(t.identifier(cmp), t.identifier(cmp))
            ),
            t.stringLiteral('react-native')
        );
        ast.program.body.unshift(newImport);
        return;
    }
    const existingSpecifiers = importDeclarationPath.node.specifiers;
    const existingImportedNames = new Set(
        existingSpecifiers
            .filter(spec => t.isImportSpecifier(spec))
            .map(spec => spec.imported.name)
    );
    Array.from(usedComponents).forEach((cmp) => {
        if (!existingImportedNames.has(cmp)) {
            existingSpecifiers.push(
                t.importSpecifier(t.identifier(cmp), t.identifier(cmp))
            );
        }
    });
}

const programCLI = new Command();
programCLI
    .version('1.0.0')
    .description('ReactJS to ExpoJS Converter')
    .requiredOption('-i, --input <path>', 'Path to the input ReactJS file')
    .requiredOption('-o, --output <path>', 'Path to the output ExpoJS file')
    .parse(process.argv);

const options = programCLI.opts();
const inputPath = path.resolve(options.input);
const outputPath = path.resolve(options.output);

if (!fs.existsSync(inputPath)) {
    console.error(`Input file does not exist: ${inputPath}`);
    process.exit(1);
}

const reactCode = fs.readFileSync(inputPath, 'utf-8');
const ast = babelParser.parse(reactCode, {
    sourceType: 'module',
    plugins: ['jsx', 'importMeta', 'classProperties', 'typescript'],
});

traverse(ast, {
    ImportDeclaration(path) {
        transformImports(path);
    },
    JSXElement(path) {
        transformJSX(path);
    },
    VariableDeclarator(path) {
        transformHooks(path);
    },
    CallExpression(path) {
        replaceLocalStorage(path);
    },
});

generateStyleSheet(ast);
addAdditionalImports(ast);
addTypeInterfaces(ast);
addFontLoading(ast);

const usedComponents = collectUsedReactNativeComponents(ast);
ensureReactNativeImports(ast, usedComponents);

const { code } = generate(ast, {}, reactCode);
fs.writeFileSync(outputPath, code, 'utf-8');
console.log(`Conversion complete! Output written to ${outputPath}`);
