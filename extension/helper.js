export async function extractRequestData(details) {
    const url = new URL(details.url);

    console.log("URL: ", url)
    console.log("DETAILS: ", details)

    // return {
    //     status: details.statusCode,
    //     sizeBytes: parseInt(details.responseHeaders['content-length']),
    //     resourceType: typeValue(details.type),

    //     //header
    //     ad_auction_allowed: extractHeaders(details.responseHeaders),
    //     customappheader: extractHeaders(details.responseHeaders),
    //     x_datadog_parent_id: extractHeaders(details.responseHeaders),
    //     x_datadome: extractHeaders(details.responseHeaders),
    //     x_datadome_cid: extractHeaders(details.responseHeaders),
    //     x_envoy_upstream_address: extractHeaders(details.responseHeaders),
    //     x_guploader_uploadid: extractHeaders(details.responseHeaders),
    //     x_readtime: extractHeaders(details.responseHeaders),

    //     //mimeType 
    //     application_graphql_response_json: checkMimeType(details.responseHeaders, "application/graphql-response+json"),
    //     application_javascript: checkMimeType(details.responseHeaders, "application/javascript"),
    //     application_json: checkMimeType(detail.responseHeaders, "application/json"),
    //     application_speculationrules_json: checkMimeType(detail.responseHeaders, "application/speculationrules+json"),
    //     application_x_javascript: checkMimeType(detail.responseHeaders, "application/x-javascript"),
    //     binary_octet_stream: checkMimeType(detail.responseHeaders, "application/speculationrules+json"),
    //     text_javascript: checkMimeType(detail.responseHeaders, "text/javascript"),
    //     image_gif: checkMimeType(detail.responseHeaders, "image/gif"),
    //     image_jpeg: checkMimeType(detail.responseHeaders, "image/jpeg"),
    //     image_png: checkMimeType(detail.responseHeaders, "image/png"),
    //     image_webp: checkMimeType(detail.responseHeaders, "image/webp"),
    //     text_javascript: checkMimeType(detail.responseHeaders, "image/jpg"),

    //     url_length: details.url.length,
    //     is_image: isImageUrl(details.url),
    //     isHttps: isHttps(details.url),
    //     queryParam_num: countParams(Object.fromEntries(url.searchParams.entries())),
    //     path_count: pathCount(url.pathname)
    // };
}
function checkMimeType(headers, targetType) {
    const contentTypeHeader = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === 'content-type'
    );
    const mimeType = contentTypeHeader ? contentTypeHeader[1].split(';')[0].trim().toLowerCase() : 'unknown';

    return mimeType === targetType.toLowerCase() ? 1 : 0;
}


function typeValue(data) {
    const resourceTypeMap = {
        'document': 0,
        'image': 1,
        'script': 2,
        'font': 3,
        'fetch': 4,
        'stylesheet': 5,
        'xhr': 6,
        'ping': 7,
        'other': 8,
        'media': 9,
        'manifest': 10
    };

    if (data in resourceTypeMap) return resourceTypeMap[data];
    return 8;
}

function categoryValue(data) {
    const resourceCategoryMap = {
        'other': 0,
        'image': 1,
        'script': 2,
        'font': 3,
        'stylesheet': 4,
        'xhr': 5
    };

    if (data in resourceCategoryMap) return resourceCategoryMap[data];
    return 0;
}

function pathCount(path) {
    try {
        const pathSegments = path
            .split('/')
            .filter(segment => segment.length > 0);
        return pathSegments.length;

    } catch (e) {
        console.error('Invalid URL:', url);
        return 0;
    }
}

function isHttps(url) {
    url_sliced = url.split("//");
    if (url_sliced[0] === "https") return 1
    return 0
}

function countParams(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.keys(obj).length;
}

function isImageUrl(url) {
    const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;
    return imagePattern.test(url) ? 1 : 0;
}


//check for empty/NaN content
function isEmptyContent(text) {
    return !text || typeof text !== 'string' || text.trim().length <= 5;
}

//remove /* */ comments
function removeBlockComments(text) {
    if (text === "empty_content") return text;

    let result = text;
    while (true) {
        const commentStart = result.indexOf("/*");
        const commentEnd = result.indexOf("*/");

        if (commentEnd === -1) {
            if (commentStart !== -1) return "empty_content";
            break;
        }
        result = result.substring(commentEnd + 2);
    }
    return result.trimStart();
}

//remove // comments
function removeLineComments(text) {
    if (text.includes("//#")) {
        text = text.substring(4);
    }

    if (text.includes("//")) {
        const keywords = ['function', 'window', 'var', 'let', 'const'];
        let earliestIndex = -1;

        for (const keyword of keywords) {
            const idx = text.indexOf(keyword);
            if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
                earliestIndex = idx;
            }
        }

        if (earliestIndex !== -1) {
            text = text.substring(Math.max(0, earliestIndex - 1));
        } else {
            text = "empty_content";
        }
    }

    return text;
}

function detectContentType(text) {
    if (text === "empty_content") return 6;

    // js
    if (/(?:function|if\s|var\s|let\s|const\s|=>|\(\))/.test(text)) return 1;
    //json
    if (/^[\s]*\{[\s]*"/.test(text) || /^[\s]*\[[\s]*"/.test(text)) return 2;

    //html
    if (/^[\s]*</.test(text) || /<\/?[a-z][\s\S]*?>/i.test(text)) return 3;

    //css
    if (/^[\s]*(body|html|style|#|\.).*\{/.test(text) || text.startsWith("@")) return 4;

    //unknown
    return 5;
}


// List of headers
const specificHeaders = [
    "ad_auction_allowed",
    "customappheader",
    "x_adobe_edge",
    "x_datadog_parent_id",
    "x_datadome",
    "x_datadome_cid",
    "x_envoy_upstream_address",
    "x_readtime",
    "x_guploader_uploadid"
];

function extractHeaders(headersArray) {
    const lowerHeaders = headersArray.map(header => {
        return header.name.toLowerCase().replace("-", "_");
    });

    specificHeaders.forEach(targetHeader => {
        const exists = lowerHeaders.some(header =>
            header === targetHeader
        );
        if (exists) {
            return 1;
        }
    });
    return 0;
}

async function getContentSample(details) {
    try {
        const response = await fetch(details.url);
        if (!shouldSampleContent(response.headers.get('content-type'))) return null;

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        return decoder.decode(buffer.slice(0, 500));
    } catch (e) {
        return null;
    }
}

function getResponseSize(details) {
    const contentLength = details.responseHeaders?.find(
        h => h.name.toLowerCase() === 'content-length'
    )?.value;
    return contentLength ? parseInt(contentLength) : null;
}

async function processAndSaveRequest(details) {
    const rawData = await extractRequestData(details);
    const labeledData = {
        ...rawData,
        label: classifyRequest(rawData) // Add classification
    };

    await saveToSupabase(labeledData);
}
