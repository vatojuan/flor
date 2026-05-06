import { Card, CardContent, CardActions, Typography, Button, Box, LinearProgress, CardMedia } from "@mui/material";
import { useRouter } from 'next/router';

export default function CourseCard({ course, isEnrolled, onEnroll }) {
  const router = useRouter();

  const handleSeeCourse = (courseId) => {
    router.push(`/cursos/${courseId}`);
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
          component="img"
          height="140"
          image={course.imageUrl || 'https://placehold.co/600x400/4E342E/FFF?text=Curso'}
          alt={`Portada de ${course.title}`}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {course.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {course.description}
        </Typography>
        {isEnrolled && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">Progreso:</Typography>
            <LinearProgress variant="determinate" value={course.progress} />
          </Box>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end", p: 2 }}>
        {isEnrolled ? (
          <Button variant="contained" color="primary" onClick={() => handleSeeCourse(course.id)}>
            Ver Curso
          </Button>
        ) : (
          <Button variant="outlined" color="primary" onClick={() => onEnroll(course.id)}>
            Inscribirme
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
