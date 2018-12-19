<h1>0x1f.ie service</h2>

A URL shortening and QR generator service developed with Node.js.

<h2>Introduction</h2>
The 0x1f service is composed by two nodejs script : 0x1f and admin.0x1f. The first one is in charge of url 
redirectioning based on short url. The second provide a restfull interface to perform operation like adding a 
new urls and short url, qrtag generation.

<h2>REST interface</h2>
The rest interface present a simple path for redirections. 
<ul>
    <li>GET 0x1f.ie/xxxxx : Redirection to the url matching 'xxxxx' short url or 404 error if not found.</li>
    <li>GET 0x1f.ie?url={url}&tagType={tagtype:Size}&dw=true&fname={filename}
        <ul>
            <li>url : Url encoded url where the qrtag, short url is linked to.</li>
            <li>tagType : Tag type mathing a tagtype in database followed with ':' and tag size. ex. whiteBlackSquareSvg:L</li>
            <li>dw : Download. When this value is true the qr tag is downloaded</li>
            <li>fname : The download file name.Use with db=true</li>
        </ul>
    </li>
    
</ul>

<h2>Server setup</h2>
<p>The 0n1f service is running in an Ubuntu machine. It requires nodejs v0.2.4 and couchdb running in the host</p>
<p>Run <code>apt-get install couchdb</code> to install couchdb<p>
<p>Install nodejs. Run <code>git clone git://github.com/ry/node.git</code> and then run
<code>./configure && make && make install</code><p>

<h2>Nodejs modules installation</h2>
<p>0n1f is dependen on several nodejs modules. Easiest way to install dependecies is 
to use npm. To install npm use : curl http://npmjs.org/install.sh | sh
<p>
Once you have nmp installed use npm to install required nodejs modules:
</p>
<ul>
    <li>nmp install joose joosex-namespace-depended</li>
    <li>nmp install hash</li>
    <li>nmp install connect</li>
    <li>nmp install express</li>
    <li>nmp install formidable@latest</li>
    <li>nmp install request</li>
    <li>npm install bufferlist</li>
</ul>
</p>

<h2>Nginx configuration</h2>
<p>Nginx is installed in the server because the servers hosted also a number of websites. Node is accessed throught ngix that 
will act as a proxy to the 0x1f nodejs service.</p>
<p>Main domian setup in nginx is 0x1f.ie which proxies all the communication with nodejs. There is also a subdomain 
admin.0x1f.ie to allow admin operation like add new post, generate qrtags.</p>
<p>Coachdb and futon can be access in the admin subdomine at port 5000. e.x: Access futon at: http://admin.0x1f.ie:5000/utils</p>
<p>0x1f.ie static pages are at : /var/www/0x1f.ie. admin.0x1f.ie are at : /var/www/admin.0x1f.ie</p> 

<h3>Devel notes</h2>
<p>
</p>
<!--<h2>Todo's and suggestions</h2>
<p>User can propose short url, pickup one from a list...</p>-->
