/**
 * Generate a comprehensive pool of 500+ unique avatar URLs
 * Using multiple sources to ensure uniqueness
 */

function generateAvatarPool() {
  const avatars = [];
  
  // Random User API - generates unique faces
  for (let i = 1; i <= 99; i++) {
    avatars.push(`https://randomuser.me/api/portraits/men/${i}.jpg`);
    avatars.push(`https://randomuser.me/api/portraits/women/${i}.jpg`);
  }
  
  // This Person Does Not Exist API - AI generated unique faces
  for (let i = 1; i <= 100; i++) {
    avatars.push(`https://this-person-does-not-exist.com/img/avatar-${String(i).padStart(6, '0')}.jpg`);
  }
  
  // UI Avatars with unique names/initials
  const names = [
    'John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Alex', 'Amy',
    'Tom', 'Kate', 'Ben', 'Anna', 'Sam', 'Nina', 'Jack', 'Mia', 'Luke', 'Eva',
    'Ryan', 'Zoe', 'Dan', 'Ivy', 'Max', 'Ava', 'Ian', 'Uma', 'Leo', 'Zia',
    'Paul', 'Rose', 'Mark', 'Joy', 'Sean', 'Belle', 'Carl', 'Grace', 'Noah', 'Hope',
    'Adam', 'Faith', 'Liam', 'Dawn', 'Owen', 'Sky', 'Cole', 'Rain', 'Dean', 'Star'
  ];
  
  const backgrounds = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9'];
  
  names.forEach((name, i) => {
    backgrounds.forEach(bg => {
      avatars.push(`https://ui-avatars.com/api/?name=${name}&background=${bg}&color=fff&size=150`);
    });
  });
  
  // DiceBear API - various styles for unique avatars
  const diceBearStyles = ['avataaars', 'bottts', 'identicon', 'initials', 'personas'];
  const seeds = Array.from({length: 50}, (_, i) => `seed${i}`);
  
  diceBearStyles.forEach(style => {
    seeds.forEach(seed => {
      avatars.push(`https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&size=150`);
    });
  });
  
  return [...new Set(avatars)]; // Remove any duplicates
}

const avatarPool = generateAvatarPool();
console.log(`Generated ${avatarPool.length} unique avatars`);

export { avatarPool };