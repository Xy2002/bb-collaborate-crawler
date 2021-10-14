const axios = require('axios');
const to = require('await-to-js').default
const request = require('request');
const username = require('./config.js').username
const password = require('./config.js').password
const domain = require('./config.js').domain
const getRandomValues = require('get-random-values');
const cheerio = require('cheerio')
const btoa = require('btoa');
const xml2js = require('xml2js');

/**
 * Parse xml and extract key information into an array of objects
 * @param html{string}
 * @return {Promise<unknown>}
 */
function xmlParseToArray(html) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(html, function (err, res) {
            if (err) {
                reject(err)
            }
            const $ = cheerio.load(res.contents)
            let courseLength = $("#_3_1termCourses_noterm > ul").children().length
            let arr = []
            for (let i = 1; i <= courseLength; i++) {
                let htmlNode = $(`#_3_1termCourses_noterm > ul > li:nth-child(${i})`)
                let tempObj = {}
                tempObj.href = domain + htmlNode.children("a").attr('href').trim()
                tempObj.courseName = htmlNode.children("a").text()
                tempObj.instructor = htmlNode.children("div").children(".name").text()
                tempObj.id = htmlNode.children("a").attr('href').toString().split("id=")[1].split("&")[0]
                arr.push(tempObj)
            }
            resolve(arr)
        })
    })
}

/**
 * Generate encryption parameters
 * @param t{number} length
 * @return {string}
 */
function generateId(t) {
    function e() {
        return n ? 15 & n[r++] : 16 * Math.random() | 0
    }

    var r = 0,
        n = getRandomValues(new Uint8Array(31))
    // a : 16 , length
    for (var i = [], a = 0; a < t; a++) i.push(e().toString(16));
    return i.join("")
}

/**
 * Parameters required to generate the request
 * @param t{string} function generateId(16)
 * @param e{string} function generateId(32)
 * @return {string}
 */
function genrateTraceparent(t, e) {
    return "00-" + e + "-" + t + "-01"
}

/**
 * Parameters required to generate the request
 * @param t function generateId(16)
 * @param e Date.now()
 * @param n accountID
 * @param r agentID
 * @param o trustKey
 * @return {string}
 */
function generateTracestate(t, e, n, r, o) {
    var i = 0, a = "", s = 1, c = "", f = "";
    return o + "@nr=" + i + "-" + s + "-" + n + "-" + r + "-" + t + "-" + a + "-" + c + "-" + f + "-" + e
}

/**
 * Parameters required to generate the request
 * @param t function generateId(16)
 * @param e function generateId(32)
 * @param n Date.now()
 * @param r accountID
 * @param o agentID
 * @param i trustKey
 */
function generateNewrelic(t, e, n, r, o, i) {
    var s = {v: [0, 1], d: {ty: "Browser", ac: r, ap: o, id: t, tr: e, ti: n}};
    return i && r !== i && (s.d.tk = i), btoa(JSON.stringify(s))
}

/**
 * Remove the path and other related attributes from the elements of the array, keeping only the key-value
 * @param Cookies{Array}
 * @return {String}
 */
function removingPathFromArray(Cookies) {
    let arrayIndex = 0
    for (const cookiesElement of Cookies) {
        if (cookiesElement.includes(" Path=/;")) {
            Cookies[arrayIndex] = cookiesElement.split(" Path=/;")[0]
        } else if (cookiesElement.includes("PATH=/;")) {
            Cookies[arrayIndex] = cookiesElement.split("PATH=/;")[0]
        } else if (cookiesElement.includes(" Path=")) {
            Cookies[arrayIndex] = cookiesElement.split(" Path=")[0]
        }
        arrayIndex++
    }
    return Cookies
}

/**
 * Get BbRouter from the Cookies array
 * @param Cookies{Array}
 * @return {(string|*)[]}
 */
function getBbRouterFromCookies(Cookies) {
    let arrayIndex = 0
    let flag = false;
    let tempString, err;
    for (const cookiesElement of Cookies) {
        if (cookiesElement.includes("BbRouter")) {
            tempString = cookiesElement
            flag = true
            break;
        }
        arrayIndex++
    }
    if (!flag) {
        err = "function getBbRouterFromCookies:No BbRouter Found"
    }
    return [err, tempString]
}

/**
 * Update the BbRouter in the Cookies array
 * @param oldCookies{Array}
 * @param newCookies{String}
 * @return {(string|*)[]}
 */
function updateBbRouterInCookies(oldCookies, newCookies) {
    let arrayIndex = 0;
    let flag = false;
    let err;
    for (const oldCookiesElement of oldCookies) {
        if (oldCookiesElement.includes("BbRouter")) {
            oldCookies[arrayIndex] = newCookies;
            flag = true
            break;
        }
        arrayIndex++
    }
    if (!flag) {
        err = "function updateBbRouterInCookies:No BbRouter Found"
    }
    return [err, oldCookies]
}

/**
 * Login and get cookies in *.blackboard.com
 * @return {Promise<Array>}
 */
async function getCookiesFromAcademicAffairsSystem() {
    return new Promise((async (resolve, reject) => {
        console.log(`A request is being sent to ${domain} to obtain the initialization cookie`);
        let initializingConfig = {
            method: 'get',
            url: domain,
            headers: {
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                "Connection": 'keep-alive'

            }
        };
        let [err, res] = await to(axios(initializingConfig));
        if (err) {
            reject(err.message);
        }
        let initializingCookies = res.headers['set-cookie'];
        let xsrfToken;
        initializingCookies = removingPathFromArray(initializingCookies);
        for (const initializingCookiesElement of initializingCookies) {
            if (initializingCookiesElement.includes("xsrf")) {
                xsrfToken = initializingCookiesElement.split("xsrf:")[1].split(";")[0];
                break;
            }
        }
        if (!xsrfToken) {
            reject("Did not get the xsrfToken, please re-run");
        }
        console.log("Successfully obtained the initialization cookie")
        console.log(`Login requests are being sent to the ${domain}/webapps/login/ interface`)
        const options = {
            'method': 'POST',
            'url': `${domain}/webapps/login/`,
            'headers': {
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Upgrade-Insecure-Requests': '1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                'Cookie': initializingCookies.join(""),
                "Connection": 'keep-alive'

            },
            form: {
                'action': 'login',
                'blackboard.platform.security.NonceUtil.nonce.ajax': xsrfToken,
                'login': 'Login',
                'new_loc': '',
                'password': password,
                'user_id': username
            }
        };
        request(options, function (error, response) {
            if (error) reject(error);
            let err;
            [err, initializingCookies] = updateBbRouterInCookies(initializingCookies, response.headers['set-cookie'][0]);
            if (err) {
                reject(err)
            }
            console.log("Login successfully, and cookies are updated")
            initializingCookies = removingPathFromArray(initializingCookies)
            resolve(initializingCookies);
        });
    }))
}

/**
 * Get courses at *.blackboard.com
 * @param Cookies
 * @return {Promise<String>} The requested interface will return a response in XML format
 */
async function getMyCourses(Cookies) {
    return new Promise((async (resolve, reject) => {
        console.log(`A request is being sent to ${domain}/webapps/portal/execute/defaultTab to update the cookie`)
        let [error, cookieString] = getBbRouterFromCookies(Cookies)
        if (error) {
            reject(error)
        }
        let config = {
            method: 'get',
            url: `${domain}/webapps/portal/execute/defaultTab`,
            headers: {
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Cookie': cookieString
            }
        };
        let [err, res] = await to(axios(config))
        if (err) {
            reject(err)
        }
        let initCookies = res.headers['set-cookie']
        initCookies = removingPathFromArray(initCookies)
        console.log("The request was successful and the cookie was updated")
        console.log(`A request is being sent to ${domain}/webapps/portal/execute/tabs/tabAction?tab_tab_group_id=_1_1 to update the cookie`)

        let config2 = {
            method: 'get',
            url: `${domain}/webapps/portal/execute/tabs/tabAction?tab_tab_group_id=_1_1`,
            headers: {
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                'Cookie': initCookies.join("")
            }
        };
        let [err2, res2] = await to(axios(config2))
        if (err2) {
            reject(err2)
        }
        let err3;
        [err3, initCookies] = updateBbRouterInCookies(initCookies, res2.headers['set-cookie'][0])
        if (err3) {
            reject(err3)
        }
        initCookies = removingPathFromArray(initCookies)
        console.log("The request was successful and the cookie was updated")
        console.log("The response HTML is being parsed")
        let $ = cheerio.load(res2.data)
        let scriptText = $('head > script:nth-child(10)')[0].children[0].data
        let accountID = scriptText.split("accountID:\"")[1].split("\"")[0]
        let agentID = scriptText.split("agentID:\"")[1].split("\"")[0]
        let trustKey = scriptText.split("trustKey:\"")[1].split("\"")[0]
        let tempCookie2, err4
        [err4, tempCookie2] = getBbRouterFromCookies(initCookies)
        if (err4) {
            reject(err4)
        }
        let tracestate = generateTracestate(generateId(16), Date.now(), accountID, agentID, trustKey)
        let traceparent = genrateTraceparent(generateId(16), generateId(32))
        let newrelic = generateNewrelic(generateId(16), generateId(32), Date.now(), accountID, agentID, trustKey)
        console.log(`Parsing completed to get the key parameters,A request is being sent to ${domain}/webapps/portal/execute/tabs/tabAction to get course lists`)
        var options3 = {
            'method': 'POST',
            'url': `${domain}/webapps/portal/execute/tabs/tabAction`,
            'headers': {
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'X-NewRelic-ID': 'UgEFVVRUGwIBVFJaDgYDX1I=',
                'tracestate': tracestate,
                'traceparent': traceparent,
                'sec-ch-ua-mobile': '?0',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'newrelic': newrelic,
                'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
                'X-Prototype-Version': '1.7',
                'X-Requested-With': 'XMLHttpRequest',
                'sec-ch-ua-platform': '"macOS"',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'Cookie': tempCookie2
            },
            form: {
                'action': 'refreshAjaxModule',
                'modId': '_3_1',
                'tabId': '_1_1',
                'tab_tab_group_id': '_1_1'
            }
        };
        request(options3, function (err, res) {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })
    }))

}

/**
 * Get online class information from us-lti.bbcollab.com
 * Only one interface will be requested at a time, so if you want to get all the course information, you need to call this function in a loop
 * @param Cookies
 * @param id Course ID
 * @return {Promise<Object>}
 */
async function getBbcollabSeesion(Cookies, id) {
    return new Promise(async (resolve, reject) => {
        Cookies = removingPathFromArray(Cookies)
        console.log(`A request is being sent to ${domain}/webapps/blackboard/execute/launcher?type=Course&id=${id}&url= to update the cookie`)
        let config = {
            method: 'get',
            url: `${domain}/webapps/blackboard/execute/launcher?type=Course&id=${id}&url=`,
            headers: {
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                'Cookie': Cookies.join("")
            }
        };
        let [err, res] = await to(axios(config))
        if (err) {
            reject(err)
        }
        [err, Cookies] = updateBbRouterInCookies(Cookies, res.headers['set-cookie'][1])
        if (err) {
            reject(err)
        }
        Cookies = removingPathFromArray(Cookies)
        console.log(`A POST request is being sent to ${domain}/webapps/collab-ultra/tool/collabultra/lti/launch?course_id=${id} to get course belief information`)
        config = {
            method: 'get',
            url: `${domain}/webapps/collab-ultra/tool/collabultra/lti/launch?course_id=${id}`,
            headers: {
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Dest': 'iframe',
                'Cookie': Cookies.join("")
            }
        };
        [err, res] = await to(axios(config))
        if (err) {
            reject(err)
        }
        let htmlText = res.data
        const $ = cheerio.load(htmlText)
        let obj = {}
        for (let i = 0; i < $('#bltiLaunchForm').children().length; i++) {
            let name = $('#bltiLaunchForm').children()[i + '']['attribs']['name']
            let value = $('#bltiLaunchForm').children()[i + '']['attribs']['value']
            obj[name] = value
        }
        let options = {
            'method': 'POST',
            'url': 'https://us-lti.bbcollab.com/lti',
            'headers': {
                'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Upgrade-Insecure-Requests': '1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Dest': 'iframe'
            },
            form: {
                'context_id': obj.context_id,
                'context_label': obj.context_label,
                'context_title': obj.context_title,
                'custom_caliper_federated_session_id': obj.custom_caliper_federated_session_id,
                'custom_caliper_profile_url': obj.custom_caliper_profile_url,
                'custom_lms_type': obj.custom_lms_type,
                'custom_lms_url': obj.custom_lms_url,
                'custom_lms_version': obj.custom_lms_version,
                'custom_site_id': obj.custom_site_id,
                'custom_tc_profile_url': obj.custom_tc_profile_url,
                'custom_username': obj.custom_username,
                'ext_fnds_course_id': obj.ext_fnds_course_id,
                'ext_fnds_tenant_id': obj.ext_fnds_tenant_id,
                'ext_fnds_user_id': obj.ext_fnds_user_id,
                'ext_launch_presentation_css_url': obj.ext_launch_presentation_css_url,
                'ext_lms': obj.ext_lms,
                'launch_presentation_locale': obj.launch_presentation_locale,
                'lis_person_contact_email_primary': obj.lis_person_contact_email_primary,
                'lis_person_name_family': obj.lis_person_name_family,
                'lis_person_name_full': obj.lis_person_name_full,
                'lis_person_name_given': obj.lis_person_name_given,
                'lis_person_sourcedid': obj.lis_person_sourcedid,
                'lti_message_type': obj.lti_message_type,
                'lti_version': obj.lti_version,
                'oauth_callback': obj.oauth_callback,
                'oauth_consumer_key': obj.oauth_consumer_key,
                'oauth_nonce': obj.oauth_nonce,
                'oauth_signature': obj.oauth_signature,
                'oauth_signature_method': obj.oauth_signature_method,
                'oauth_timestamp': obj.oauth_timestamp,
                'oauth_version': obj.oauth_version,
                'resource_link_description': obj.resource_link_description,
                'resource_link_id': obj.resource_link_id,
                'resource_link_title': obj.resource_link_title,
                'roles': obj.roles,
                'tool_consumer_instance_contact_email': obj.tool_consumer_instance_contact_email,
                'tool_consumer_instance_description': obj.tool_consumer_instance_description,
                'tool_consumer_instance_guid': obj.tool_consumer_instance_guid,
                'tool_consumer_instance_name': obj.tool_consumer_instance_name,
                'user_id': obj.user_id
            }
        };
        request(options, function (err, res) {
            if (err) {
                reject(err)
            }
            let jwt = decodeURI(res.headers.location.split("token=")[1])
            console.log("A request is being sent to https://us-lti.bbcollab.com/collab/api/csa/sessions?sessionCategory=course for online class information")
            options = {
                'method': 'GET',
                'url': 'https://us-lti.bbcollab.com/collab/api/csa/sessions?sessionCategory=course',
                'headers': {
                    'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': `Bearer ${jwt}`,
                    'sec-ch-ua-mobile': '?0',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
                    'sec-ch-ua-platform': '"macOS"',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Dest': 'empty'
                }
            };
            request(options, function (err, res3) {
                if (err)
                    reject(err)
                resolve(JSON.parse(res3.body))
            })
        })
    })

}

async function main() {
    let err, initCookies, res2, res3, res4;
    [err, initCookies] = await to(getCookiesFromAcademicAffairsSystem())
    if (err) {
        console.error("err!", err)
    }
    [err, res2] = await to(getMyCourses(initCookies))
    if (err) {
        console.error("err!", err)
    }
    [err3, res3] = await to(xmlParseToArray(res2.body))
    if (err) {
        console.error("err!", err)
    }
    //This can be modified here by calling the function getBbcollabSeesion multiple times with for
    [err, res4] = await to(getBbcollabSeesion(res2.headers['set-cookie'], res3[0].id))
    if (err) {
        console.error("err!", err)
    }
    return res4
}

main().then(r => console.log(r)).catch(err=> console.error(err))
