// Simple test to check what data the frontend is receiving
// Run this in the browser console on the AIChat page

console.log('=== FRONTEND DATA TEST ===');

// Check what children data is being received
fetch('/api/profile/children', { credentials: 'include' })
  .then(response => response.json())
  .then(data => {
    console.log('Children data from backend:', data);
    console.log('Children with their IDs:');
    data.forEach(child => {
      console.log(`  ${child.name}: child_id=${child.child_id}, id=${child.id}`);
    });
  });

// Check what conversations data is being received
fetch('/api/conversations', { credentials: 'include' })
  .then(response => response.json())
  .then(data => {
    console.log('Conversations data from backend:', data);
    console.log('Conversations with their childIds:');
    data.forEach(conv => {
      console.log(`  Conversation ${conv.id}: childId=${conv.childId}, title=${conv.title}`);
    });
  }); 