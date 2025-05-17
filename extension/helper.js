export async function extractRequestData(details) {
    const url = new URL(details.url);
    return {
        status: details.statusCode,
        sizeBytes: getResponseSize(details),
        resourceType: typeValue(details.responseHeaders['content-type']),

        //header
        ad_auction_allowed: extractHeaders(details.responseHeaders),
        customappheader: extractHeaders(details.responseHeaders),
        x_datadog_parent_id: extractHeaders(details.responseHeaders),
        x_datadome: extractHeaders(details.responseHeaders),
        x_datadome_cid: extractHeaders(details.responseHeaders),
        x_envoy_upstream_address: extractHeaders(details.responseHeaders),
        x_guploader_uploadid: extractHeaders(details.responseHeaders),
        x_readtime: extractHeaders(details.responseHeaders),

        //mimeType 
        application_graphql_response_json: checkMimeType(details.responseHeaders, "application/graphql-response+json"),
        application_javascript: checkMimeType(details.responseHeaders, "application/javascript"),
        application_json: checkMimeType(details.responseHeaders, "application/json"),
        application_speculationrules_json: checkMimeType(details.responseHeaders, "application/speculationrules+json"),
        application_x_javascript: checkMimeType(details.responseHeaders, "application/x-javascript"),
        binary_octet_stream: checkMimeType(details.responseHeaders, "application/speculationrules+json"),
        text_javascript: checkMimeType(details.responseHeaders, "text/javascript"),
        image_gif: checkMimeType(details.responseHeaders, "image/gif"),
        image_jpeg: checkMimeType(details.responseHeaders, "image/jpeg"),
        image_png: checkMimeType(details.responseHeaders, "image/png"),
        image_webp: checkMimeType(details.responseHeaders, "image/webp"),
        text_javascript: checkMimeType(details.responseHeaders, "image/jpg"),

        url_length: url.href,
        is_image: isImageUrl(url.pathname),
        isHttps: isHttps(url.protocol),
        queryParam_num: countParams(Object.fromEntries(url.searchParams.entries())),
        path_count: pathCount(url.pathname)
    };
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
    if (url === "https:") return 1
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


function getResponseSize(details) {
    const contentLength = details.responseHeaders?.find(
        h => h.name.toLowerCase() === 'content-length'
    )?.value;
    return contentLength ? parseInt(contentLength) : null;
}

