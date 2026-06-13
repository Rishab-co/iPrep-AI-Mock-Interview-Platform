package com.iprep.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class AuthRequest {
    @Email @NotBlank private String email;
    @NotBlank @Size(min = 6) private String password;
}
