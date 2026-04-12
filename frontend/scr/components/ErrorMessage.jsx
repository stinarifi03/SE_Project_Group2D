export default function ErrorMessage({ message }) {
  if (!message) return null

  return (
    <div style={{
      backgroundColor: '#ffe0e0',
      color: '#cc0000',
      padding: '10px 15px',
      borderRadius: '5px',
      border: '1px solid #cc0000',
      margin: '10px 0'
    }}>
      ⚠️ {message}
    </div>
  )
}