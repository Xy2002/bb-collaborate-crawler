# bb-collaborate-crawler  
Blackboard Collaborate Crawler  
This script completes automatic login and data collection at *.blackboard.com, then automatically sends a request to Blackboard Collaborate Ultra for your online course information at your school (in json format).

#Usage
To use this repository, you must have Node.JS installed.  
Then the relevant configuration is done in `config.js`.  
`domain` : Your school's Blackboard Collaborate domains.  
`username` :  Your account in the system.  
`password` : Your password in the system.  
Then run `node index.js` from the console.  

#Instructions
Let's assume that my school's Blackboard Collaborate domain is abc.blackboard.com.  
Then the url after login should be `https://abc.blackboard.com/webapps/portal/execute/tabs/tabAction?tab_tab_group_id=_1_1`.  
And there is an area on the page titled My Courses, which means that the script is available to you.  
If this is not applicable, you can use Network in Developer Tools to view the specific request to modify the script. And in general, the request type is usually Doc, only when sending to https://us-lti.bbcollab.com/* The request type is XHR when sending a POST request.  
In particular, the script's asynchronous functions all return a promise.
