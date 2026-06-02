const {GoogleGenAI} = require("@google/genai")
const {z} = require("zod")
const { zodToJsonSchema  } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")


const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A numerical score (e.g., from 0 to 100) indicating how well the candidate's resume and self-description match the requirements and expectations outlined in the job description. A higher score indicates a better match."),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical questions can be asked in the interview"),
        intention: z.string().describe("The intension of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to be covered in the answer")
    })).describe("A list of technical questions that are likely to be asked in the interview, along with the intention behind each question and guidance on how to answer them effectively."),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical questions can be asked in the interview"),
        intention: z.string().describe("The intension of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to be covered in the answer")
    })).describe("A list of behavioral questions that are likely to be asked in the interview, along with the intention behind each question and guidance on how to answer them effectively."),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity level (low, medium, high) indicating how critical it is to address that gap for the target job")
    })).describe("A list of skill gaps identified based on the analysis of the resume, self-description, and job description. Each skill gap includes the name of the skill and the severity level (low, medium, high) indicating how critical it is to address that gap for the target job."),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus or theme for that day of preparation"),
        tasks: z.array(z.string()).describe("A list of specific tasks or activities to be completed on that day to address the identified skill gaps and prepare for the interview")
    })).describe("A day-wise preparation plan outlining specific tasks and focus areas for each day leading up to the interview. The plan is designed to help the candidate systematically address the identified skill gaps and prepare effectively for the interview."),
    title: z.string().describe("The title of the job position for which the interview preparation report is generated."),
})

async function generateInterviewReport({resume, selfDescription, jobDescription}){

    const prompt = `Generate a comprehensive interview preparation report based on the following inputs:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents:prompt,
        config:{
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),

        }
    })


    return JSON.parse(response.text)


}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })


    const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } })

    await browser.close()

    return pdfBuffer
}


async function generateResumePdf({resume, selfDescription, jobDescription}){
    const resumePdfSchema = z.object({
        html:z.string().describe("The HTML content of the resume PDF, which can be rendered and converted to a PDF format for download.")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume, which can be rendered and converted to a PDF format for download.
                        the resume should be tailored to the job description provided, highlighting the most relevant skills and experiences, and formatted in a professional and visually appealing manner suitable for submission to potential employers.
                        the content of resume shoulf be not sound like generated by AI, it should be natural and human like.
                        you can highlight the content usint some colors and different font sizes to make it more visually appealing, but the overall design should remain professional.
                        the content should be ats friendly, meaning it should be easily parsable by Applicant Tracking Systems (ATS) used by many employers to screen resumes. Avoid using complex formatting or graphics that may not be parsed correctly by ATS software.
                        the resume should not be so lengthy, it should be concise and to the point, ideally fitting within 1-2 pages when rendered as a PDF. focus on quality over quantity, ensuring that every section and bullet point adds value and relevance to the job description provided.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents:prompt,
        config:{
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })

    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}


module.exports = { generateInterviewReport, generateResumePdf }