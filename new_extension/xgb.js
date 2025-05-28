export class SimpleXGBoost {
    constructor(modelDump) {
        this.trees = this.parseModelDump(modelDump);
    }

    // Parsira XGBoost dump format u stablo
    parseModelDump(dump) {
        const trees = [];
        const lines = dump.split('\n').filter(line => line.trim());
        let currentTreeNodes = {};
        let currentTreeRootId = null;
        let inTree = false;
        for (let line of lines) {
            line = line.trim()

            if (/^\d+:/.test(line)) {
                inTree = true;
                const [idPart, content] = line.split(':');
                const id = parseInt(idPart.trim(), 10);
                const trimmed = content.trim();

                if (currentTreeRootId === null) {
                    currentTreeRootId = id;
                }

                if (trimmed.startsWith('leaf=')) {
                    // Leaf node
                    const value = parseFloat(trimmed.split('=')[1]);
                    currentTreeNodes[id] = {
                        id,
                        is_leaf: true,
                        leaf_value: value
                    };
                } else {
                    // Split node
                    const match = trimmed.match(/\[(.+?)([<>])(.+?)\]/);
                    let feature, operator, thresholdStr;

                    if (match) {
                        [feature, operator, thresholdStr] = [match[1], match[2], match[3]];
                    } else {
                        const featureOnly = trimmed.match(/\[(.+?)\]/);
                        if (featureOnly) {
                            feature = featureOnly[1];
                            operator = 'exists';
                            thresholdStr = null;
                        } else {
                            console.error("Unable to parse feature from line:", trimmed);
                            continue;
                        }
                    }

                    const meta = trimmed.split(']')[1].split(',');
                    const yes = parseInt(meta.find(m => m.includes('yes=')).split('=')[1]);
                    const no = parseInt(meta.find(m => m.includes('no=')).split('=')[1]);

                    currentTreeNodes[id] = {
                        id,
                        is_leaf: false,
                        feature,
                        operator,
                        threshold: thresholdStr !== null ? parseFloat(thresholdStr) : null,
                        yes,
                        no
                    };
                }
            } else if (inTree) {
                trees.push(this.buildTree(currentTreeNodes, currentTreeRootId));
                currentTreeNodes = {};
                currentTreeRootId = null;
                inTree = false;
            }
        }

        if (Object.keys(currentTreeNodes).length > 0) {
            trees.push(this.buildTree(currentTreeNodes, currentTreeRootId));
        }

        return trees;
    }
    parseNode(line) {
        const indent = line.match(/^\t*/)[0].length;
        const content = line.trim();

        const match = content.match(/\[(.*?)([<>])(.*?)\]/);
        if (!match) {
            // Leaf node
            const leafValue = parseFloat(content.split('=')[1]);
            return {
                indent,
                is_leaf: true,
                leaf_value: leafValue
            };
        }

        const [_, feature, operator, threshold] = match;
        const [yes, no] = content.split(']')[1].split(',').map(x => parseInt(x.split('=')[1]));

        return {
            indent,
            is_leaf: false,
            feature,
            operator,
            threshold: parseFloat(threshold),
            yes,
            no
        };
    }

    buildTree(nodeMap, nodeId) {
        const node = nodeMap[nodeId];
        if (!node) return null;

        if (node.is_leaf) {
            return {
                is_leaf: true,
                leaf_value: node.leaf_value
            };
        }

        return {
            is_leaf: false,
            feature: node.feature,
            operator: node.operator,
            threshold: node.threshold,
            left_child: this.buildTree(nodeMap, node.yes),
            right_child: this.buildTree(nodeMap, node.no)
        };
    }

    predictNode(node, features) {
        if (!node) return 0;

        if (node.is_leaf) {
            return node.leaf_value;
        }

        const featureValue = features[node.feature] ?? 0;
        const comparison = node.operator === '<'
            ? featureValue < node.threshold
            : featureValue > node.threshold;

        return comparison
            ? this.predictNode(node.left_child, features)
            : this.predictNode(node.right_child, features);
    }

    predict(features) {
        let prediction = 0;
        for (const tree of this.trees) { prediction += this.predictNode(tree, features); }
        return this.sigmoid(prediction);
    }

    sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
}