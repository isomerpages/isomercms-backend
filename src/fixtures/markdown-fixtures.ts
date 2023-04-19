const normalFrontMatter = `layout: simple-page
title: Digital Transformation
permalink: /digital-transformation/
breadcrumb: Digital Transformation`

const maliciousFrontMatter = `layout: simple-page<script>alert('Evil layout')</script>
title: Digital Transformation
permalink: /digital-transformation/<script>alert('Evil permalink')</script>
breadcrumb: Digital Transformation`

const normalPageContent = `### Test header
### **Subheader**
Content
![Image](/path/to-image.jpg)`

const maliciousPageContent = `### Test header
### **Subheader**
Content<script>alert('Evil in markdown')</script>
![Image](/path/to-image.jpg)`

export const normalMarkdownContent = `---
${normalFrontMatter}
---
${normalPageContent}`

export const maliciousMarkdownContent = `---
${maliciousFrontMatter}
---
${maliciousPageContent}`

export const normalJsonObject = {
  frontMatter: {
    layout: "simple-page",
    title: "Digital Transformation",
    permalink: "/digital-transformation/",
    breadcrumb: "Digital Transformation",
  },
  pageContent: normalPageContent,
}
export const maliciousJsonObject = {
  frontMatter: {
    layout: "simple-page<script>alert('Evil frontmatter')</script>",
    title: "Digital Transformation",
    permalink: "/digital-transformation/",
    breadcrumb: "Digital Transformation",
  },
  pageContent: maliciousPageContent,
}

export const rawInstagramEmbedScript =
  '<script src="//www.instagram.com/embed.js" async></script>'

export const sanitizedInstagramEmbedScript =
  '<script async="" src="//www.instagram.com/embed.js"></script>'

export const frontMatterWithSymbol = `---
title: Digital Strategy & the 101 of Search Engine Optimisation (SEO)
permalink: /digital-programmes/masterclasses-and-workshops/digital-strategy-and-the-101-of-seo/
breadcrumb: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
third_nav_title: Masterclasses &amp; Workshops
description: ""
---
<img style="width:100%;" src="/images/images-2021/DigitalProgrammes-Image-Masterclass.png">

<h4 style="text-align:center;">Next intake:</h4>

<center><table style="width:80%;">
    <tbody><tr style="text-align:center;">
      <th style="text-align:center;width:50%;">Online Training</th>
      <th style="text-align:center;width:50%;">Face-to-Face</th>
    </tr>
    <tr style="text-align:center;">
      <td style="text-align:center;width:50%;">16 June (Fri)</td>
      <td style="text-align:center;width:50%;">To be confirmed</td>
    </tr>
</tbody></table></center>

<p>Business decision makers will learn how to apply simple digital frameworks, analyse digital campaign successes, formulate an actionable, forward-focus review, perform simple budgeting for digital strategies, project potential marketing ROI from digital campaigns as well as drive sales and boost business through SEO execution. This class covers successful case studies in Singapore and is extremely hands-on.</p>

<p>This is an introductory program that is suitable for acquiring an overview of existing industry practices in digital marketing and SEO, looking to understand the change in consumer behaviour to adapt their business marketing plans, and seeking clear direction to drive breakthrough marketing campaigns.</p>

<h4>Course Title | Mode of Training | Course Ref</h4>

<p>Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO) 
<br>Synchronous E-learning -TGS-2020501149</p>

<h4>Outline</h4>
<ul>
<li>Introduction to today’s digital space</li>
<li>Understand social media, search engine, email marketing and e-Commerce platforms</li>
<li>Fundamental digital strategy</li>
<li>Select the right digital channel, craft a simple  digital framework, understand how digital ROI is derived, plan a budget and project returns</li>
<li>Introduction to SEO</li>
<li>Determine this channel for growth, understand all necessary aspects of optimisation/ backlinking strategy and know 101 of hiring/ working with SEO vendors</li>
<li>Evaluating digital campaigns &amp; key metrics</li>
<li>Create a simple framework to evaluate campaign success or failure and understand key metrics from Google Analytics and Google Webmaster tools</li>
  </ul>

<h4>Requirements</h4>
<p>Participants are required to have a Gmail account, bring a laptop and have Google Chrome (Safari on Mac) browser installed for constant practice.</p>
  
<h4>Duration</h4>
<p>9am - 6pm (8 hours)</p>
  
<h4>Trainer Profile</h4>


<div class="row">
    <div class="col is-4">
		<figure style="margin:0;">
			<img style="width:60%;" src="/images/images-2021/Masterclass Trainer_Jayden Ooi.png">
			<figcaption style="color:#0AD25A" class="has-text-weight-bold"> </figcaption>
		</figure>
	</div>
	<div class="col is-8">
        <b>Jayden Ooi</b><br><i>Entrepreneur, Digital Strategist</i><br><br>Jayden Ooi is highly qualified in practice with many successful digital transformations for SMEs to pivot their brick-and-mortar businesses into the digital space. With his
expertise, a local retailer successfully redesigned its business model, ranked number one on Google, and achieved more than three million dollars in e-commerce sales. In another instance, he helped a local F&amp;B SME to rise to the top ranking and triple its
annual revenue. Jayden is an experienced professional in SEO, digital marketing, and e-commerce development. Over the years, he has built a staunch customer portfolio and a successful team in Singapore and Malaysia. His agency, NightOwl SEO, has helped many of his clients to be in the top 5 rankings on Google.
	</div>
</div>

<h4>Fees (GST 8% - For payment made on/after 1 Jan 2023)</h4>

<center>
<table style="width:100%;">
<tbody><tr>
<th style="width:70%;">Category</th>
<th style="width:30%:">Price</th>
</tr>

<tr>
<td>Full Fee</td>
<td>$810</td>
</tr>

<tr>
  <td>Singapore Citizen<sup>0</sup> (70% funding)</td>
<td>$240.75</td>
</tr>
	
<tr>
  <td>Singapore Citizen 40 years and above<sup>0,1</sup> (90% funding)</td>
<td>$90.75</td>
</tr>

<tr>
  <td>Singapore Citizen sponsored by SMEs<sup>0,2</sup> (90% funding)</td>
<td>$90.75</td>
</tr>

<tr>
  <td>Singapore PR (70% funding)</td>
<td>$243</td>
</tr>

<tr>
<td>Singapore PR sponsored by SMEs<sup>2</sup> (90% funding)</td>
<td>$93</td>
</tr>

</tbody></table>
</center>


<small><i>Fees include prevailing GST
<br>Funding Eligibility Period: 1 Oct 2021 to 30 Sep 2024
<br><small><i><sup>0</sup>The increase of 1% GST on fees will be absorbed for Singapore Citizens in 2023
<br><small><i><sup>1</sup>Fee is under the <a href="/services/consultancy/skillsfuture-midcareer-enhanced-subsidy">Mid-career Enhanced Subsidy(MCES)</a>
<br><sup>2</sup>Fee is under the <a href="/services/consultancy/etss">Enhanced Training Support for SMEs (ETSS)</a><br>
</i></small>

<h4>Additional Support</h4>

<p>This course is also eligible for the following:</p>

<b>For self-sponsored participants:</b>
<ul>
  <li><a href="/services/consultancy/skillsfuture-credit">SkillsFuture Credit</a></li>
 
  <li><a href="/services/consultancy/wss-individuals">Workfare Skills Support (WSS) Scheme (For Individuals)</a></li>
</ul>

<b>For company-sponsored participants:</b>
<ul>
  <li><a href="/services/consultancy/absentee-payroll-ap">Absentee Payroll</a></li>
  <li><a href="/services/consultancy/wss-companies">Workfare Skills Support (WSS) Scheme (For Companies)</a></li>
	<li><a href="/services/consultancy/skillsfuture-enterprise-credit">SkillsFuture Enterprise Credit</a></li>
  </ul>

<p>For more information about funding and support, click <a href="/services/consultancy">here.</a></p>

<div style="width:50%;float:left;"><center><a style="background-color:#06225e; border:white; color:white; padding: 10px 10px; text-align:center; display:inline-block; margin: 4px 2px; cursor:pointer;text-decoration:none;" href="https://form.gov.sg/642d0e18682ef300118c4588">Register Now</a></center></div>

<div style="width:50%;float:left;"><center><a style="background-color:#06225e; border:white; color:white; padding: 10px 10px; text-align:center; display:inline-block; margin: 4px 2px; cursor:pointer;text-decoration:none;" href="https://form.gov.sg/602f33f172d5100012d6ca8b">Request for Brochure</a></center></div>
</i></small></i></small>`
