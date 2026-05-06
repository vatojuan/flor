// components/ProfileImage.js
import React, { useState } from "react";
import { Box, Avatar, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

export default function ProfileImage({ currentImage, onImageSelected }) {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onImageSelected(file);
    }
  };

  return (
    <Box sx={{ position: "relative", display: "inline-block" }}>
      <Avatar
        src={preview || currentImage}
        sx={{ width: 100, height: 100, border: "2px solid #ccc" }}
      />
      <IconButton
        component="label"
        sx={{
          position: "absolute",
          bottom: 5,
          right: 5,
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
          width: 30,
          height: 30,
        }}
      >
        <EditIcon fontSize="small" />
        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
      </IconButton>
    </Box>
  );
}
