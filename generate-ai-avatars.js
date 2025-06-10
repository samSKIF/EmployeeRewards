/**
 * Generate AI-powered profile pictures for Canva employees
 * Uses OpenAI DALL-E to create unique, professional headshots
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create uploads directory if it doesn't exist
const uploadsDir = './server/uploads/ai-avatars';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function detectEthnicity(name, surname) {
  const fullName = `${name} ${surname}`.toLowerCase();
  
  // European/Western names
  if (/\b(smith|johnson|williams|brown|jones|garcia|miller|davis|rodriguez|martinez|hernandez|lopez|gonzalez|wilson|anderson|thomas|taylor|moore|jackson|martin|lee|perez|thompson|white|harris|sanchez|clark|ramirez|lewis|robinson|walker|young|allen|king|wright|scott|torres|nguyen|hill|flores|green|adams|nelson|baker|hall|rivera|campbell|mitchell|carter|roberts)\b/.test(fullName)) {
    return 'western';
  }
  
  // Asian names
  if (/\b(wang|li|zhang|liu|chen|yang|huang|zhao|wu|zhou|xu|sun|ma|zhu|hu|guo|he|lin|gao|luo|zheng|liang|xie|tang|song|xu|deng|han|feng|cao|peng|zeng|xiao|tian|dong|pan|yuan|cai|jiang|yu|du|ye|cheng|wei|jiang|shi|fu|shen|zhan|kong|qin|lu|gu|meng|xue|yin|qiu|jiang|yan|yu|xu|zou|qian|jin|su|wang|takahashi|tanaka|watanabe|ito|yamamoto|nakamura|kobayashi|kato|yoshida|yamada|sasaki|yamaguchi|saito|matsumoto|inoue|kimura|hayashi|shimizu|suzuki|yamazaki|endo|aoki|kato|ogawa|hasegawa|murakami|ishii|kim|park|lee|choi|jung|kang|cho|yoon|jang|lim|han|oh|seo|shin|kwon|song|hong|ahn|jeon|hwang|moon|yang|nam|yoo)\b/.test(fullName)) {
    return 'asian';
  }
  
  // Hispanic/Latino names
  if (/\b(garcia|rodriguez|martinez|hernandez|lopez|gonzalez|perez|sanchez|ramirez|torres|flores|rivera|gomez|diaz|reyes|morales|cruz|ortiz|gutierrez|espinoza|vasquez|castillo|jimenez|rojas|vargas|romero|alvarez|medina|rubio|ruiz|fernandez|vega|soto|contreras|aguilar|mendoza|delgado|herrera|luna|valle|peralta|pena|rios|alvarado|sandoval|cortez|guerrero|ramos|estrada|valdez|montoya|salazar|miranda|duran|zamora|campos|santos|velasquez|carrillo|maldonado|silva|figueroa|avila|moreno)\b/.test(fullName)) {
    return 'hispanic';
  }
  
  // Middle Eastern names
  if (/\b(ahmed|hassan|ali|mohamed|mahmoud|ibrahim|omar|youssef|mustafa|amr|tamer|khaled|mohamed|abdullah|salem|nasser|fathi|adel|reda|waleed|sherif|tarek|karim|sameh|hany|ashraf|ramy|eslam|mahmoud|ayman|hatem|wael|emad|hesham|gamal|sayed|mostafa|osama|alaa|ziad|mohsen|mazen|maged|samir|bassem|hossam|nader|kareem|abdelrahman|abdo|fahmy|sabry|farouk|soliman|amin|fouad|refaat|gaber|shawky|el|al)\b/.test(fullName)) {
    return 'middle_eastern';
  }
  
  // African names
  if (/\b(jackson|williams|johnson|brown|jones|davis|miller|wilson|moore|taylor|anderson|thomas|harris|martin|thompson|garcia|martinez|robinson|clark|rodriguez|lewis|lee|walker|hall|allen|young|hernandez|king|wright|lopez|hill|scott|green|adams|baker|gonzalez|nelson|carter|mitchell|perez|roberts|turner|phillips|campbell|parker|evans|edwards|collins|stewart|sanchez|morris|rogers|reed|cook|morgan|bell|murphy|bailey|rivera|cooper|richardson|cox|howard|ward|torres|peterson|gray|ramirez|james|watson|brooks|kelly|sanders|price|bennett|wood|barnes|ross|henderson|coleman|jenkins|perry|powell|long|patterson|hughes|flores|washington|butler|simmons|foster|gonzales|bryant|alexander|russell|griffin|diaz|hayes)\b/.test(fullName)) {
    return 'african';
  }
  
  // Indian/South Asian names
  if (/\b(kumar|singh|sharma|gupta|agarwal|verma|mehta|patel|jain|shah|kapoor|malhotra|arora|bansal|goel|mittal|aggarwal|joshi|tiwari|mishra|pandey|yadav|srivastava|chauhan|saxena|goyal|agrawal|chopra|bhatia|tandon|khanna|sethi|rastogi|bajaj|sinha|bhardwaj|sachdeva|khurana|thakur|mahajan|chandra|tyagi|rajan|nair|menon|iyer|rao|reddy|krishnan|mukherjee|banerjee|chatterjee|das|dutta|ghosh|roy|sen|bose|paul|saha|mitra|chakraborty|bhattacharya|ganguly|mondal|sarkar|kar|majumdar|basu|chowdhury|ahmed|khan|ali|rahman|islam|hasan|hussain|shah|begum|khatun|akter|sultana|bibi|fatima|yasmin|nasreen|parveen|rashid|karim|malik|siddiqui|qureshi|sheikh|chaudhry|butt|dar|lone|wani|kumar|rather|gul|shafi|mir|bhat|koul|pandit|devi|kumari|rani|lata|maya|sita|gita|radha|kamala|sunita|anita|rita|mira|kiran|usha|asha|shanti|lakshmi|saraswati|parvati|durga|kali|gauri|uma|sushma|vandana|kavita|sangita|mamta|rekha|geeta|neeta|seeta|meera|veena|leela|sheela|kamla|sudha|vidya|nisha|pooja|priya|kavya|divya|shreya|navya|anya|arya|avani|diya|ira|isha|jiya|kiya|maya|naya|riya|siya|tiya|ziya)\b/.test(fullName)) {
    return 'south_asian';
  }
  
  return 'western'; // Default
}

function inferGender(name) {
  const maleNames = ['james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'christopher', 'charles', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'jason', 'edward', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'gregory', 'alexander', 'patrick', 'frank', 'raymond', 'jack', 'dennis', 'jerry'];
  const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah', 'dorothy', 'lisa', 'nancy', 'karen', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah', 'dorothy', 'amy', 'angela', 'ashley', 'brenda', 'emma', 'olivia', 'cynthia', 'marie', 'janet', 'catherine', 'frances', 'christine', 'samantha', 'debra', 'rachel', 'carolyn', 'janet', 'virginia', 'maria', 'heather', 'diane', 'julie', 'joyce', 'victoria', 'kelly', 'christina', 'joan', 'evelyn', 'lauren', 'judith', 'megan', 'cheryl', 'andrea', 'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'sara', 'janice', 'marie', 'julia', 'heather', 'diane', 'ruth', 'julie', 'joyce', 'virginia', 'victoria', 'kelly', 'christina', 'joan', 'evelyn', 'lauren', 'judith', 'megan', 'cheryl', 'andrea', 'hannah', 'jacqueline', 'martha', 'gloria'];
  
  const lowerName = name.toLowerCase();
  
  if (maleNames.includes(lowerName)) return 'male';
  if (femaleNames.includes(lowerName)) return 'female';
  
  // Check name endings for gender inference
  if (lowerName.endsWith('a') || lowerName.endsWith('ia') || lowerName.endsWith('elle') || lowerName.endsWith('lyn')) {
    return 'female';
  }
  
  return Math.random() > 0.5 ? 'male' : 'female'; // Random if unclear
}

function getCountryFromNationality(nationality) {
  if (!nationality) return 'United States';
  
  const nationalityMap = {
    'american': 'United States',
    'canadian': 'Canada',
    'british': 'United Kingdom',
    'australian': 'Australia',
    'japanese': 'Japan',
    'chinese': 'China',
    'indian': 'India',
    'german': 'Germany',
    'french': 'France',
    'italian': 'Italy',
    'spanish': 'Spain',
    'brazilian': 'Brazil',
    'mexican': 'Mexico',
    'korean': 'South Korea',
    'thai': 'Thailand',
    'vietnamese': 'Vietnam',
    'emirati': 'United Arab Emirates'
  };
  
  return nationalityMap[nationality?.toLowerCase()] || nationality;
}

function createPrompt(employee) {
  const ethnicity = detectEthnicity(employee.name, employee.surname || '');
  const gender = employee.sex || inferGender(employee.name);
  const country = getCountryFromNationality(employee.nationality);
  
  let ethnicityDesc = '';
  switch(ethnicity) {
    case 'asian':
      ethnicityDesc = 'East Asian or Southeast Asian';
      break;
    case 'south_asian':
      ethnicityDesc = 'South Asian or Indian subcontinent';
      break;
    case 'hispanic':
      ethnicityDesc = 'Hispanic or Latino';
      break;
    case 'middle_eastern':
      ethnicityDesc = 'Middle Eastern or North African';
      break;
    case 'african':
      ethnicityDesc = 'African or African American';
      break;
    default:
      ethnicityDesc = 'Caucasian or European';
  }
  
  return `Professional corporate headshot photo of a ${gender} person of ${ethnicityDesc} ethnicity, approximately 30-40 years old, wearing professional business attire, clean white or light gray background, high quality portrait photography, friendly and professional expression, well-lit studio lighting, corporate professional style`;
}

async function generateAvatarImage(employee) {
  try {
    const prompt = createPrompt(employee);
    
    console.log(`Generating avatar for ${employee.name} (${employee.email})`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0].url;
    
    // Download and save the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const filename = `avatar_${employee.id}_${Date.now()}.png`;
    const filepath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    
    // Return the local URL that can be served by the Express server
    return `/uploads/ai-avatars/${filename}`;
    
  } catch (error) {
    console.error(`Error generating avatar for ${employee.name}:`, error);
    // Fallback to UI Avatar if AI generation fails
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random&color=fff&size=150&rounded=true&seed=${employee.id}`;
  }
}

async function generateAIAvatars() {
  const client = await pool.connect();
  
  try {
    console.log('Starting AI avatar generation for Canva employees...');
    
    // Get all Canva employees
    const result = await client.query(`
      SELECT id, name, surname, email, department, phone_number, sex, nationality, birth_date
      FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
      LIMIT 50
    `);
    
    const employees = result.rows;
    console.log(`Processing ${employees.length} employees (first batch)`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process employees in batches to respect API rate limits
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      
      try {
        const avatarUrl = await generateAvatarImage(employee);
        
        // Update database with new avatar URL
        await client.query(
          'UPDATE users SET avatar_url = $1 WHERE id = $2',
          [avatarUrl, employee.id]
        );
        
        successCount++;
        console.log(`✅ Generated avatar ${i + 1}/${employees.length} for ${employee.name}`);
        
        // Rate limiting - wait 2 seconds between requests
        if (i < employees.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to generate avatar for ${employee.name}:`, error);
      }
    }
    
    console.log(`\n🎉 Avatar generation complete!`);
    console.log(`✅ Successfully generated: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Success rate: ${Math.round((successCount / employees.length) * 100)}%`);
    
  } catch (error) {
    console.error('Error in avatar generation:', error);
  } finally {
    client.release();
  }
}

generateAIAvatars()
  .then(() => {
    console.log('AI avatar generation process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Avatar generation failed:', error);
    process.exit(1);
  });