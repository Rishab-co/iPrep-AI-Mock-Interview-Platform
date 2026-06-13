package com.iprep.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RespondRequest {
    @NotBlank
    private String content;
}
