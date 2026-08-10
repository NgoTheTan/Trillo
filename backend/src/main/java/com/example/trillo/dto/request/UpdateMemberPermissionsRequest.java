package com.example.trillo.dto.request;

import com.example.trillo.enums.BoardPermission;

import java.util.List;

public record UpdateMemberPermissionsRequest(List<BoardPermission> permissions) {}
