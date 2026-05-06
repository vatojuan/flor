// pages/job-offer.js
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Button,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import DashboardLayout from '../components/DashboardLayout'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.fapmendoza.online'

export default function JobOfferPage () {
  const router = useRouter()
  const { id } = router.query                     // /job-offer?id=123

  const [job, setJob]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    if (!router.isReady) return

    const idStr =
      Array.isArray(id) ? id[0] : id           // por si viniera como array

    if (!idStr || idStr === 'undefined') return   // ⚠️ guard extra

    const fetchJob = async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`${API_BASE}/api/job/${idStr}`)
        if (!res.ok) throw new Error('Oferta no encontrada')
        const { job } = await res.json()
        setJob(job)
      } catch (err) {
        console.error('[JobOffer] error:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [router.isReady, id])

  const postedDate = job?.createdAt
    ? new Date(job.createdAt).toLocaleDateString()
    : null
  const expirationDate = job?.expirationDate
    ? new Date(job.expirationDate).toLocaleDateString()
    : null

  return (
    <DashboardLayout>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Cargando oferta…</Typography>
          </Box>
        ) : error || !job ? (
          <Alert severity="error">
            Oferta no encontrada
            <br />
            La oferta que buscas no existe o ha sido eliminada.
          </Alert>
        ) : (
          <>
            <Typography variant="h4" gutterBottom>
              {job.title}
            </Typography>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}
              >
                {job.description}
              </Typography>
            </Paper>

            {job.requirements && (
              <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Requisitos
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}
                >
                  {job.requirements}
                </Typography>
              </Paper>
            )}

            <Box sx={{ mb: 2, color: 'text.secondary' }}>
              <Typography variant="body2">
                <strong>Publicado el:</strong>{' '}
                {postedDate ?? 'Sin fecha'}
              </Typography>
              <Typography variant="body2" color="error">
                <strong>Expiración:</strong>{' '}
                {expirationDate ?? 'Sin expiración'}
              </Typography>
            </Box>

            <Box
              sx={{
                mb: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <PersonIcon />
              <Typography variant="body2">
                Candidatos postulados: {job.candidatesCount ?? 0}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button component={Link} href="/dashboard" variant="contained">
                Volver al Dashboard
              </Button>
              <Button component={Link} href="/job-list" variant="outlined">
                Ver Ofertas
              </Button>
            </Stack>
          </>
        )}
      </Container>
    </DashboardLayout>
  )
}

// Evitamos prerendering en Vercel
export const getServerSideProps = () => ({ props: {} })
