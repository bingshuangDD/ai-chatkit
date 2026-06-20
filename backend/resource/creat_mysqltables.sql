-- MySQL schema
-- department definition

CREATE TABLE `department` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL, -- 部门名称
  `parent_id` INT, -- 上级部门ID
  `manager_id` INT, -- 部门负责人ID
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间
  `edit_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- 更新时间
);

CREATE UNIQUE INDEX `uniq_department_name` ON `department` (`name`);

-- employee definition

CREATE TABLE `employee` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `employee_no` VARCHAR(50) NOT NULL, -- 员工编号
  `name` VARCHAR(100) NOT NULL, -- 姓名
  `gender` INT NOT NULL DEFAULT 0, -- 0-未知 1-男 2-女
  `birth_date` DATE, -- 出生日期（改用 DATE 类型）
  `phone` VARCHAR(20) NOT NULL, -- 联系电话
  `email` VARCHAR(255) NOT NULL, -- 电子邮箱
  `department_id` INT NOT NULL, -- 所属部门
  `position` VARCHAR(100) NOT NULL, -- 当前职位
  `entry_date` DATE NOT NULL, -- 入职日期
  `status` INT NOT NULL DEFAULT 2, -- 1-试用 2-在职 3-离职
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
  `edit_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- 更新时间
);

CREATE UNIQUE INDEX `uniq_employee_no` ON `employee` (`employee_no`);